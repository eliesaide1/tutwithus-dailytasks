// Team availability: the PDF's day × person table, and a timeline (bars per person per day).
import { DAYS_SHORT, WEEK_ORDER } from "@/Shared/constants";
import { formatRange } from "@/Shared/time";
import { cn } from "@/Shared/format";
import type { AvailabilityRow } from "@/Shared/Types";
import { AP_Avatar } from "@/components/AP_Avatar";

const pct = (m: number) => `${(m / 1440) * 100}%`;

export function AP_AvailabilityTimeline({ rows, todayColumn }: { rows: AvailabilityRow[]; todayColumn: number | null }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-emerald-400/80" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-sky-400/80" /> Work window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-brand-700" /> Meeting
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded border border-dashed border-amber-400 bg-amber-50" /> Unspecified
        </span>
      </div>
      {WEEK_ORDER.map((dow, col) => (
        <div key={dow} className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-xs", col === todayColumn && "ring-2 ring-accent-400")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">{DAYS_SHORT[dow]}</h3>
            <div className="relative hidden h-4 flex-1 sm:ml-36 sm:block">
              {[0, 6, 12, 18, 24].map((h) => (
                <span key={h} className="absolute -translate-x-1/2 text-[10px] text-slate-400" style={{ left: pct(h * 60) }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {rows.map(({ person, days }) => {
              const cell = days[col]!;
              return (
                <div key={person.id} className="flex items-center gap-3">
                  <div className="flex w-32 shrink-0 items-center gap-2">
                    <AP_Avatar name={person.name} src={person.avatarUrl} size={22} />
                    <span className="truncate text-xs font-medium text-slate-700">{person.name.split(" ")[0]}</span>
                  </div>
                  <div className="relative h-5 flex-1 rounded bg-slate-100">
                    {[6, 12, 18].map((h) => (
                      <div key={h} className="absolute inset-y-0 w-px bg-white" style={{ left: pct(h * 60) }} />
                    ))}
                    {cell.markers.some((m) => m.kind === "UNSPECIFIED") && (
                      <div
                        className="absolute inset-0 rounded border border-dashed border-amber-400 bg-amber-50/70"
                        title="Hours unspecified – confirm"
                      />
                    )}
                    {cell.markers.some((m) => m.kind === "OFF") && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-400">OFF</div>
                    )}
                    {cell.windows.map((w, i) => (
                      <div
                        key={i}
                        title={`${formatRange(w.start, w.end)}${w.note ? ` · ${w.note}` : ""}`}
                        className={cn("absolute inset-y-0.5 rounded-sm", w.kind === "WORK" ? "bg-sky-400/80" : "bg-emerald-400/80")}
                        style={{ left: pct(w.start), width: pct(w.end - w.start) }}
                      />
                    ))}
                    {cell.meetings.map((m, i) => (
                      <div
                        key={`${m.id}-${i}`}
                        title={`${formatRange(m.start, m.end)} ${m.title}`}
                        className="absolute inset-y-1.5 rounded-sm bg-brand-700"
                        style={{ left: pct(m.start), width: `max(4px, ${pct(m.end - m.start)})` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
