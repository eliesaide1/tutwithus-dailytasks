// 7-day time grid (Mon→Sun) with meeting blocks; hover (or focus) shows details.
import { MapPin } from "lucide-react";
import { DAYS_SHORT, WEEK_ORDER } from "@/Shared/constants";
import { formatRange } from "@/Shared/time";
import { cn } from "@/Shared/format";
import { columnDate } from "@/Shared/ScheduleFunctions";
import type { Occurrence, ScheduleMeeting } from "@/Shared/Types";

const HOUR_PX = 44;

const statusDot: Record<string, string> = {
  CONFIRMED: "bg-emerald-500",
  PENDING: "bg-amber-400",
  DECLINED: "bg-red-500",
};

export function AP_WeekCalendar({
  occurrences,
  meetings,
  week,
  todayColumn,
  viewerId,
}: {
  occurrences: Occurrence[];
  meetings: Map<string, ScheduleMeeting>;
  week: string;
  todayColumn: number | null;
  viewerId: string;
}) {
  // Fit the visible hours to the content, defaulting to 07:00-22:00.
  let minHour = 7;
  let maxHour = 22;
  for (const o of occurrences) {
    for (const s of o.segments) {
      minHour = Math.min(minHour, Math.floor(s.start / 60));
      maxHour = Math.max(maxHour, Math.ceil(s.end / 60));
    }
  }
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const height = hours.length * HOUR_PX;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
        <div className="border-b border-slate-200" />
        {WEEK_ORDER.map((dow, col) => {
          const today = col === todayColumn;
          return (
            <div key={dow} className={cn("border-b border-l border-slate-200 px-2 py-2 text-center", today && "bg-accent-100/60")}>
              <div className={cn("text-xs font-semibold uppercase", today ? "text-brand-700" : "text-slate-500")}>{DAYS_SHORT[dow]}</div>
              <div className={cn("text-lg leading-tight font-bold", today ? "text-brand-700" : "text-slate-800")}>
                {columnDate(week, col).getUTCDate()}
              </div>
            </div>
          );
        })}

        {/* hour labels */}
        <div className="relative" style={{ height }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-400" style={{ top: i * HOUR_PX }}>
              {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {WEEK_ORDER.map((dow, col) => (
          <div key={dow} className={cn("relative border-l border-slate-200", col === todayColumn && "bg-accent-100/30")} style={{ height }}>
            {hours.map((h, i) => (
              <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * HOUR_PX }} />
            ))}
            {occurrences.flatMap((o) => {
              const meeting = meetings.get(o.meetingId);
              if (!meeting) return [];
              return o.segments
                .filter((s) => s.column === col)
                .map((s, i) => {
                  const top = ((s.start - minHour * 60) / 60) * HOUR_PX;
                  const h = Math.max(((s.end - s.start) / 60) * HOUR_PX, 22);
                  const mine = meeting.attendees.some((a) => a.userId === viewerId);
                  const team = meeting.attendees.length > 2;
                  // Popover opens to the left on the last columns so it stays on screen.
                  const left = col >= 5;
                  return (
                    <div key={`${o.meetingId}-${i}`} tabIndex={0} className="group absolute inset-x-1 outline-none" style={{ top, height: h }}>
                      <div
                        className={cn(
                          "h-full overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-[11px] leading-tight shadow-xs group-focus:ring-2 group-focus:ring-brand-200",
                          team ? "border-accent-500 bg-accent-100 text-brand-900" : "border-brand-600 bg-brand-50 text-brand-800",
                          !mine && "opacity-70",
                        )}
                      >
                        <div className="font-semibold">{formatRange(s.start, s.end)}</div>
                        <div className="truncate">{meeting.title}</div>
                      </div>
                      <div
                        className={cn(
                          "pointer-events-none invisible absolute top-0 z-20 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100",
                          left ? "right-full mr-2" : "left-full ml-2",
                        )}
                      >
                        <p className="text-sm font-semibold text-slate-900">{meeting.title}</p>
                        {meeting.purpose && <p className="mt-0.5 text-slate-500">{meeting.purpose}</p>}
                        {meeting.location && (
                          <p className="mt-1 flex items-center gap-1 text-slate-500">
                            <MapPin className="size-3" /> {meeting.location}
                          </p>
                        )}
                        <p className="mt-2 mb-1 font-semibold text-slate-600">Local time for each attendee</p>
                        <ul className="space-y-0.5">
                          {o.attendeeTimes.map((a) => (
                            <li key={a.userId} className="flex items-center gap-1.5">
                              <span className={cn("size-1.5 rounded-full", statusDot[a.status] ?? "bg-slate-300")} />
                              <span className="font-medium">{a.name}</span>
                              <span className="ml-auto text-slate-500">{a.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                });
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
