// Team availability: the PDF's day × person table, and a timeline (bars per person per day).
import { Link } from "react-router";
import { Pencil } from "lucide-react";
import { DAYS_SHORT, WEEK_ORDER } from "@/Shared/constants";
import { formatRange } from "@/Shared/time";
import { cn } from "@/Shared/format";
import { columnDate, shortDate } from "@/Shared/ScheduleFunctions";
import type { AvailabilityRow } from "@/Shared/Types";
import { AP_AvailabilityMarkers } from "./AP_AvailabilityMarkers";

export function AP_AvailabilityMatrix({
  rows,
  week,
  todayColumn,
  canEdit,
}: {
  rows: AvailabilityRow[];
  week: string;
  todayColumn: number | null;
  canEdit: (userId: string) => boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="bg-brand-800 text-left text-white">
            <th className="w-20 px-3 py-2.5 font-semibold">Day</th>
            {rows.map(({ person }) => (
              <th key={person.id} className="px-3 py-2.5 font-semibold">
                <span className="flex items-center gap-1.5">
                  {person.name.split(" ")[0]}
                  {canEdit(person.id) && (
                    <Link
                      to={`/schedule/availability?user=${person.id}`}
                      className="text-brand-200 hover:text-white"
                      aria-label={`Edit ${person.name}'s availability`}
                    >
                      <Pencil className="size-3" />
                    </Link>
                  )}
                </span>
                <span className="block text-[11px] font-normal text-brand-200">{person.title}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((dow, col) => (
            <tr
              key={dow}
              className={cn("border-t border-slate-100 align-top", col % 2 === 1 && "bg-slate-50/60", col === todayColumn && "bg-accent-100/50")}
            >
              <td className="px-3 py-2.5">
                <div className="font-semibold text-slate-800">{DAYS_SHORT[dow]}</div>
                <div className="text-xs text-slate-400">{shortDate(columnDate(week, col))}</div>
              </td>
              {rows.map(({ person, days }) => {
                const cell = days[col]!;
                const empty = !cell.windows.length && !cell.markers.length && !cell.meetings.length;
                return (
                  <td key={person.id} className="space-y-1 px-3 py-2.5 text-xs text-slate-700">
                    {cell.windows.map((w, i) => (
                      <div key={i} title={w.note ?? undefined} className="tabular-nums">
                        {formatRange(w.start, w.end)}
                        {w.kind === "WORK" && <span className="ml-1 text-[10px] text-slate-400">work</span>}
                      </div>
                    ))}
                    <AP_AvailabilityMarkers cell={cell} />
                    {cell.meetings.map((m, i) => (
                      <div
                        key={`${m.id}-${i}`}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-medium",
                          m.status === "PENDING" ? "bg-amber-100 text-amber-900" : "bg-brand-50 text-brand-700",
                          m.status === "DECLINED" && "line-through opacity-60",
                        )}
                      >
                        {formatRange(m.start, m.end)} {m.title}
                        {m.status === "PENDING" && " (to confirm)"}
                      </div>
                    ))}
                    {empty && <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
