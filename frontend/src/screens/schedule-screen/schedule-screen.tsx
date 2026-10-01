import { useSearchParams } from "react-router";
import { CalendarClock, Download, Info, Pencil, Plus } from "lucide-react";
import { formatRange, zoneLabel } from "@/Shared/time";
import { useSchedule } from "@/hooks/useSchedule";
import type { Occurrence, ScheduleData, ScheduleMeeting } from "@/Shared/Types";
import { AP_ScheduleToolbar } from "@/components/AP_ScheduleToolbar";
import { AP_WeekCalendar } from "@/components/AP_WeekCalendar";
import { AP_AvailabilityMatrix } from "@/components/AP_AvailabilityMatrix";
import { AP_AvailabilityTimeline } from "@/components/AP_AvailabilityTimeline";
import { AP_MeetingsList } from "@/components/AP_MeetingsList";
import { AP_FindTime } from "@/components/AP_FindTime";
import { ScheduleCalendarUrl } from "@/Shared/SharedService";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buttonClass } from "@/components/AP_Button";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Tabs } from "@/components/AP_Tabs";

const TABS = ["week", "availability", "meetings", "find"] as const;
type Tab = (typeof TABS)[number];

export default function ScheduleScreen() {
  useDocumentTitle("Schedule");
  const user = useMe();
  const manager = user.permissions.isManager;
  const [params] = useSearchParams();
  const tabParam = params.get("tab") ?? "";
  const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : "week";
  const { data, isLoading, error } = useSchedule(params.get("week") ?? "", params.get("tz") ?? "");

  const keep = (t: Tab) => {
    const q = new URLSearchParams({ tab: t });
    if (params.get("week")) q.set("week", params.get("week")!);
    if (params.get("tz")) q.set("tz", params.get("tz")!);
    return `/schedule?${q.toString()}`;
  };

  return (
    <>
      <AP_PageHeader
        title="Schedule"
        description="Live team schedule: meetings and availability, converted to any time zone."
        actions={
          <>
            <a href={ScheduleCalendarUrl()} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" /> Add to my calendar (.ics)
            </a>
            <AP_LinkButton to="/schedule/availability" variant="secondary" size="sm">
              <Pencil className="size-4" /> My availability
            </AP_LinkButton>
            {manager && (
              <AP_LinkButton to="/schedule/meetings/new" size="sm">
                <Plus className="size-4" /> New meeting
              </AP_LinkButton>
            )}
          </>
        }
      />

      <AP_Tabs
        active={tab}
        items={[
          { key: "week", label: "Week", to: keep("week") },
          { key: "availability", label: "Team availability", to: keep("availability") },
          { key: "meetings", label: "Meetings", to: keep("meetings") },
          { key: "find", label: "Find a time", to: keep("find") },
        ]}
      />

      <AP_QueryState isLoading={isLoading} error={error}>
        {data && <ScheduleBody data={data} tab={tab} viewerId={user.id} manager={manager} />}
      </AP_QueryState>
    </>
  );
}

function ScheduleBody({ data, tab, viewerId, manager }: { data: ScheduleData; tab: Tab; viewerId: string; manager: boolean }) {
  const [params] = useSearchParams();
  const mine = params.get("mine") === "1";
  const view = params.get("view") === "timeline" ? "timeline" : "matrix";
  const meetingsById = new Map(data.meetings.map((m) => [m.id, m]));
  const weekStart = new Date(`${data.week}T00:00:00Z`);

  return (
    <>
      <AP_ScheduleToolbar
        week={data.week}
        currentWeek={data.currentWeek}
        zone={data.zone}
        zones={data.zones}
        mine={tab === "week" ? mine : undefined}
        view={tab === "availability" ? view : undefined}
      />

      {tab === "week" && (
        <WeekTab
          occurrences={
            mine ? data.occurrences.filter((o) => meetingsById.get(o.meetingId)?.attendees.some((a) => a.userId === viewerId)) : data.occurrences
          }
          meetings={meetingsById}
          data={data}
          viewerId={viewerId}
        />
      )}

      {tab === "availability" && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            Contact windows, not continuous working commitments. Shown in {zoneLabel(data.zone, weekStart)}; each person enters their own
            windows in their own time zone. 24:00 means midnight at the end of the day.
          </p>
          {view === "timeline" ? (
            <AP_AvailabilityTimeline rows={data.rows} todayColumn={data.todayColumn} />
          ) : (
            <AP_AvailabilityMatrix rows={data.rows} week={data.week} todayColumn={data.todayColumn} canEdit={(id) => manager || id === viewerId} />
          )}
        </>
      )}

      {tab === "meetings" && <AP_MeetingsList meetings={data.meetings} week={data.week} zone={data.zone} viewerId={viewerId} manager={manager} />}

      {tab === "find" && <AP_FindTime rows={data.rows} week={data.week} zone={data.zone} manager={manager} />}
    </>
  );
}

function WeekTab({
  occurrences,
  meetings,
  data,
  viewerId,
}: {
  occurrences: Occurrence[];
  meetings: Map<string, ScheduleMeeting>;
  data: ScheduleData;
  viewerId: string;
}) {
  const shifted = occurrences.filter((o) => o.mismatch);
  const weekStart = new Date(`${data.week}T00:00:00Z`);
  return (
    <>
      {shifted.length > 0 && (
        <div className="mb-4 flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Attendees are in different UTC offsets this week</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {shifted.map((o) => {
                const m = meetings.get(o.meetingId)!;
                const start = new Date(o.start);
                return (
                  <li key={o.meetingId}>
                    <strong>{m.title}</strong> ({formatRange(m.startMinute, m.endMinute)} {zoneLabel(m.timezone, start)}):{" "}
                    {o.attendeeTimes
                      .filter((a) => a.zone !== m.timezone)
                      .map((a) => `${a.name.split(" ")[0]} ${a.label.split(" ")[1]} ${zoneLabel(a.zone, start)}`)
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .join(", ")}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {occurrences.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <CalendarClock className="size-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No meetings this week</p>
          <p className="text-sm text-slate-500">Wednesday, Friday and Sunday are kept free for execution.</p>
        </div>
      ) : (
        <AP_WeekCalendar occurrences={occurrences} meetings={meetings} week={data.week} todayColumn={data.todayColumn} viewerId={viewerId} />
      )}
      <p className="mt-3 text-xs text-slate-500">
        Hover a meeting to see each attendee&apos;s local time. Times shown in {zoneLabel(data.zone, weekStart)}.
      </p>
    </>
  );
}
