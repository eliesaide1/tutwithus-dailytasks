// "Find a time": common free windows across selected people for the displayed week.
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { CalendarPlus, Search } from "lucide-react";
import { DAYS_SHORT, WEEK_ORDER } from "@/Shared/constants";
import { formatMinute, formatRange } from "@/Shared/time";
import { columnDate, intersect, mergeIntervals, shortDate, subtract, zoneCity, type Interval } from "@/Shared/ScheduleFunctions";
import type { AvailabilityRow } from "@/Shared/Types";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_Select } from "@/components/AP_Select";

const DURATIONS = [15, 30, 45, 60, 90];

export function AP_FindTime({ rows, week, zone, manager }: { rows: AvailabilityRow[]; week: string; zone: string; manager: boolean }) {
  const [params, setParams] = useSearchParams();
  const selected = params.getAll("people");
  const d = Number(params.get("duration"));
  const duration = DURATIONS.includes(d) ? d : 30;
  const [draft, setDraft] = useState<string[]>(selected);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("people");
      for (const id of draft) next.append("people", id);
      next.set("duration", String(fd.get("duration")));
      return next;
    });
  }

  const chosen = rows.filter((r) => selected.includes(r.person.id));

  const results = WEEK_ORDER.map((dow, col) => {
    let common: Interval[] | null = null;
    const unspecified: string[] = [];
    for (const { person, days } of chosen) {
      const cell = days[col]!;
      if (cell.markers.some((m) => m.kind === "UNSPECIFIED")) unspecified.push(person.name.split(" ")[0]!);
      const free = subtract(
        mergeIntervals(cell.windows.map((w) => [w.start, w.end] as Interval)),
        cell.meetings.filter((m) => m.status !== "DECLINED").map((m) => [m.start, m.end] as Interval),
      );
      common = common === null ? free : intersect(common, free);
    }
    const slots = (common ?? []).filter(([s, e]) => e - s >= duration);
    return { dow, date: columnDate(week, col), slots, unspecified };
  });

  const total = results.reduce((n, r) => n + r.slots.length, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <AP_Card className="h-fit">
        <AP_CardHeader title="Who and how long" description="Uses AVAILABLE and work windows, minus existing meetings." />
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div className="space-y-1.5">
            {rows.map(({ person }) => (
              <label key={person.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={draft.includes(person.id)}
                  onChange={(e) => setDraft((cur) => (e.target.checked ? [...cur, person.id] : cur.filter((x) => x !== person.id)))}
                  className="size-4 accent-brand-700"
                />
                <AP_Avatar name={person.name} src={person.avatarUrl} size={26} />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium text-slate-800">{person.name}</span>
                  <span className="block truncate text-xs text-slate-500">{person.title}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="label">Duration</span>
            <AP_Select name="duration" defaultValue={String(duration)}>
              {DURATIONS.map((v) => (
                <option key={v} value={v}>
                  {v} minutes
                </option>
              ))}
            </AP_Select>
          </label>
          <AP_Button type="submit" className="w-full">
            <Search className="size-4" /> Find common times
          </AP_Button>
        </form>
      </AP_Card>

      <AP_Card>
        <AP_CardHeader
          title={chosen.length ? `${total} common window${total === 1 ? "" : "s"}` : "Common free windows"}
          description={`Times in ${zoneCity(zone)}. Each window fits at least ${duration} minutes.`}
        />
        {chosen.length < 2 ? (
          <AP_EmptyState title="Pick at least two people" description="Select the people who need to meet, then search." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {results.map((r) => (
              <li key={r.dow} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start">
                <div className="w-28 shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{DAYS_SHORT[r.dow]}</p>
                  <p className="text-xs text-slate-400">{shortDate(r.date)}</p>
                </div>
                <div className="flex flex-1 flex-wrap gap-2">
                  {r.slots.length === 0 && <span className="text-sm text-slate-400">No overlap</span>}
                  {r.slots.map(([s, e]) => {
                    const q = new URLSearchParams({
                      date: r.date.toISOString().slice(0, 10),
                      start: formatMinute(s),
                      end: formatMinute(s + duration),
                      tz: zone,
                      attendees: selected.join(","),
                    });
                    return (
                      <span
                        key={s}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 py-1 pr-1 pl-2.5 text-sm text-emerald-900 ring-1 ring-emerald-200"
                      >
                        <span className="tabular-nums">{formatRange(s, e)}</span>
                        {manager && (
                          <AP_LinkButton to={`/schedule/meetings/new?${q}`} size="sm" variant="secondary" className="px-2 py-1">
                            <CalendarPlus className="size-3.5" /> Schedule
                          </AP_LinkButton>
                        )}
                      </span>
                    );
                  })}
                  {r.unspecified.length > 0 && (
                    <span className="w-full text-xs text-amber-700">Hours unspecified for {r.unspecified.join(", ")} – confirm directly.</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AP_Card>
    </div>
  );
}
