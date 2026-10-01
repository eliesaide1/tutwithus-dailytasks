// Team availability: the PDF's day × person table, and a timeline (bars per person per day).
import type { DayCell } from "@/Shared/Types";

/** OFF / hours-unspecified markers for one person-day. */
export function AP_AvailabilityMarkers({ cell }: { cell: DayCell }) {
  return (
    <>
      {cell.markers.map((m, i) =>
        m.kind === "OFF" ? (
          <span key={i} className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
            OFF
          </span>
        ) : (
          <span
            key={i}
            title={m.note ?? undefined}
            className="inline-block rounded border border-dashed border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800"
          >
            Hours unspecified – confirm
          </span>
        ),
      )}
    </>
  );
}
