import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DAYS, WEEK_ORDER } from "@/Shared/constants";
import { addDays, dateInWeek, zoneLabel } from "@/Shared/time";
import { cn, formatShortDate, parseDateInput, toDateInput } from "@/Shared/format";
import { hours } from "@/Shared/SharedFunctions";
import type { MyWeek, WeekTask } from "@/Shared/Types";
import { useMyWeek } from "@/hooks/useTasks";
import { useMe } from "@/hooks/useAuth";
import { useBackHere } from "@/hooks/useBack";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLookups } from "@/hooks/useLookups";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Card } from "@/components/AP_Card";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";
import { buttonClass } from "@/components/AP_Button";
import { AP_WeekDayRow } from "@/components/AP_WeekDayRow";
import { AP_WeekTaskCard } from "@/components/AP_WeekTaskCard";

export default function MyWeekScreen() {
  const viewer = useMe();
  const { users } = useLookups();
  const [params, setParams] = useSearchParams();
  const canSeeAll = viewer.permissions.canSeeAllTasks;
  // Only admins can open someone else's week.
  const userId = (canSeeAll && (params.get("user") || params.get("person"))) || viewer.id;
  const week = params.get("week") ?? "";
  const q = useMyWeek(userId, week);
  const data = q.data;
  const isMe = userId === viewer.id;
  useDocumentTitle(isMe ? "My week" : data ? `${data.person.name}'s week` : "Week");

  const go = (patch: { user?: string; week?: string }) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("person");
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      return next;
    });

  return (
    <div>
      <AP_PageHeader
        title={isMe ? "My week" : data ? `${data.person.name}'s week` : "Week"}
        description={
          data
            ? `Tasks due or planned for the week, in ${zoneLabel(data.person.timezone)}. Tick a task to mark it done.`
            : "Tasks due or planned for the week."
        }
        actions={
          viewer.permissions.canManageTasks && (
            <AP_LinkButton to="/tasks/new" variant="secondary">
              <Plus className="size-4" /> New request
            </AP_LinkButton>
          )
        }
      />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        {data && <WeekView data={data} users={users} viewerId={viewer.id} canSeeAll={canSeeAll} go={go} />}
      </AP_QueryState>
    </div>
  );
}

function WeekView({
  data,
  users,
  viewerId,
  canSeeAll,
  go,
}: {
  data: MyWeek;
  users: { id: string; name: string }[];
  viewerId: string;
  canSeeAll: boolean;
  go: (patch: { user?: string; week?: string }) => void;
}) {
  const { person } = data;
  const weekStart = parseDateInput(data.weekStart)!;
  const weekEnd = addDays(weekStart, 7);

  const byDay = new Map<string, WeekTask[]>();
  const planned: WeekTask[] = [];
  for (const t of data.tasks) {
    const due = t.dueDate ? new Date(t.dueDate) : null;
    if (due && due >= weekStart && due < weekEnd) {
      const key = toDateInput(due);
      byDay.set(key, [...(byDay.get(key) ?? []), t]);
    } else {
      planned.push(t);
    }
  }

  const estimate = data.tasks.reduce((n, t) => n + (t.estimateMins ?? 0), 0);
  const doneCount = data.tasks.filter((t) => t.status === "DONE").length;
  const capacity = person.weeklyCapacityMins;
  const load = capacity ? Math.round((estimate / capacity) * 100) : null;
  const weekParam = (d: Date) => toDateInput(d);

  const backHere = useBackHere(person.id === viewerId ? "My week" : `${person.name}'s week`);
  const isLate = (t: WeekTask) => t.status !== "DONE" && !!t.dueDate && toDateInput(t.dueDate) < data.today;
  const card = (t: WeekTask, showDue = false) => (
    <AP_WeekTaskCard key={t.id} task={t} late={isLate(t)} showDue={showDue} backState={backHere} />
  );

  return (
    <>
      <AP_Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        {canSeeAll && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Person</span>
          <AP_Select value={person.id} onChange={(e) => go({ user: e.target.value === viewerId ? "" : e.target.value })} className="w-auto py-1.5">
            {users.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === viewerId ? " (me)" : ""}
              </option>
            ))}
          </AP_Select>
        </label>
        )}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go({ week: weekParam(addDays(weekStart, -7)) })} className={buttonClass("ghost", "sm")} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-44 text-center text-sm font-semibold text-slate-800">
            {formatShortDate(data.weekStart)} – {formatShortDate(toDateInput(addDays(weekStart, 6)))} {weekStart.getUTCFullYear()}
          </span>
          <button type="button" onClick={() => go({ week: weekParam(addDays(weekStart, 7)) })} className={buttonClass("ghost", "sm")} aria-label="Next week">
            <ChevronRight className="size-4" />
          </button>
          {!data.isCurrentWeek && (
            <button type="button" onClick={() => go({ week: "" })} className={buttonClass("secondary", "sm")}>
              This week
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <AP_Avatar name={person.name} src={person.avatarUrl} size={24} />
            <span className="text-slate-600">{person.title}</span>
          </span>
          <span className="text-slate-600">
            <strong className="text-slate-900">{doneCount}</strong>/{data.tasks.length} done
          </span>
        </div>
      </AP_Card>

      <AP_Card className="mb-6 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">
            Estimated <strong className="text-slate-900">{hours(estimate)} h</strong>
            {capacity ? (
              <>
                {" "}
                of <strong className="text-slate-900">{hours(capacity)} h</strong> weekly capacity
              </>
            ) : (
              " (no weekly capacity set)"
            )}
          </span>
          {load !== null && (
            <span className={cn("font-semibold", load > 100 ? "text-red-600" : load > 85 ? "text-amber-700" : "text-emerald-700")}>{load}% loaded</span>
          )}
        </div>
        {load !== null && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full", load > 100 ? "bg-red-500" : load > 85 ? "bg-amber-400" : "bg-emerald-500")}
              style={{ width: `${Math.min(load, 100)}%` }}
            />
          </div>
        )}
      </AP_Card>

      <AP_Card className="divide-y divide-slate-100 overflow-hidden">
        {data.overdue.length > 0 && (
          <AP_WeekDayRow label="Overdue" sublabel="From earlier weeks" count={data.overdue.length} tone="red">
            {data.overdue.map((t) => card(t, true))}
          </AP_WeekDayRow>
        )}
        {planned.length > 0 && (
          <AP_WeekDayRow label="No due day" sublabel="Planned this week" count={planned.length}>
            {planned.map((t) => card(t, true))}
          </AP_WeekDayRow>
        )}
        {WEEK_ORDER.map((dow) => {
          const key = toDateInput(dateInWeek(weekStart, dow));
          const tasks = byDay.get(key) ?? [];
          const isToday = key === data.today;
          return (
            <AP_WeekDayRow
              key={dow}
              label={DAYS[dow]!}
              sublabel={formatShortDate(key)}
              count={tasks.length}
              tone={isToday ? "today" : key < data.today ? "muted" : "default"}
              badge={isToday ? "Today" : undefined}
              emptyText="Nothing due"
            >
              {tasks.map((t) => card(t))}
            </AP_WeekDayRow>
          );
        })}
      </AP_Card>
    </>
  );
}
