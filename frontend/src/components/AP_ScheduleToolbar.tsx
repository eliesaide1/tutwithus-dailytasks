import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDate } from "@/Shared/ScheduleFunctions";
import type { ZoneOption } from "@/Shared/Types";
import { AP_Button } from "@/components/AP_Button";
import { AP_Checkbox } from "@/components/AP_Checkbox";
import { AP_Select } from "@/components/AP_Select";

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Week navigator + timezone picker; state lives in the URL. */
export function AP_ScheduleToolbar({
  week,
  currentWeek,
  zone,
  zones,
  mine,
  view,
}: {
  week: string;
  currentWeek: string;
  zone: string;
  zones: ZoneOption[];
  mine?: boolean;
  view?: "matrix" | "timeline";
}) {
  const [, setParams] = useSearchParams();

  const set = (changes: Record<string, string | null>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      return next;
    });

  const end = shiftDate(week, 6);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <AP_Button variant="secondary" size="sm" onClick={() => set({ week: shiftDate(week, -7) })} aria-label="Previous week">
          <ChevronLeft className="size-4" />
        </AP_Button>
        <AP_Button variant="secondary" size="sm" onClick={() => set({ week: null })} disabled={week === currentWeek}>
          This week
        </AP_Button>
        <AP_Button variant="secondary" size="sm" onClick={() => set({ week: shiftDate(week, 7) })} aria-label="Next week">
          <ChevronRight className="size-4" />
        </AP_Button>
        <span className="ml-2 text-sm font-semibold text-slate-700">
          {fmt(week)} – {fmt(end)} {end.slice(0, 4)}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {mine !== undefined && (
          <AP_Checkbox label="Only my meetings" checked={mine} onChange={(e) => set({ mine: e.target.checked ? "1" : null })} />
        )}
        {view && (
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs font-medium">
            {(["matrix", "timeline"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set({ view: v === "matrix" ? null : v })}
                className={v === view ? "bg-brand-700 px-3 py-1.5 text-white" : "bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50"}
              >
                {v === "matrix" ? "Table" : "Timeline"}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Show times in
          <AP_Select value={zone} onChange={(e) => set({ tz: e.target.value })} className="w-auto py-1.5">
            {zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </AP_Select>
        </label>
      </div>
    </div>
  );
}
