import { DAYS, WEEK_ORDER } from "@/Shared/constants";
import { formatRange } from "@/Shared/time";
import type { ProfileResponse } from "@/Shared/Types";
import { AP_Badge } from "./AP_Badge";

/** A person's availability windows, one row per day (Mon → Sun). */
export function AP_WeeklyAvailability({ availability }: { availability: ProfileResponse["availability"] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {WEEK_ORDER.map((day) => {
        const slots = availability.filter((a) => a.dayOfWeek === day);
        return (
          <div key={day} className="grid grid-cols-[7rem_1fr] gap-3 px-5 py-2.5 text-sm">
            <dt className="font-medium text-slate-600">{DAYS[day]}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {slots.length === 0 && <span className="text-slate-400">—</span>}
              {slots.map((s) =>
                s.kind === "OFF" ? (
                  <AP_Badge key={s.id} tone="slate">Off</AP_Badge>
                ) : s.kind === "UNSPECIFIED" ? (
                  <AP_Badge key={s.id} tone="amber" title={s.note ?? undefined}>
                    Hours unspecified
                  </AP_Badge>
                ) : (
                  <AP_Badge key={s.id} tone={s.kind === "WORK" ? "blue" : "green"} title={s.note ?? undefined}>
                    {formatRange(s.startMinute, s.endMinute)}
                    {s.kind === "WORK" && " · work"}
                  </AP_Badge>
                ),
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
