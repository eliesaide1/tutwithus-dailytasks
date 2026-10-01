import { addDays, utcToZoned, weekStartMonday } from "@/Shared/time";
import { cn, toDateInput } from "@/Shared/format";

export type Period = { from: string; to: string };

/** This week / last week / this month / last month as calendar days in `zone`. */
export function periodPresets(zone: string, now = new Date()) {
  const thisWeek = weekStartMonday(now, zone);
  const lastWeek = addDays(thisWeek, -7);
  const today = utcToZoned(now, zone);
  const firstOfMonth = new Date(Date.UTC(today.year, today.month - 1, 1));
  const firstOfNext = new Date(Date.UTC(today.year, today.month, 1));
  const firstOfLast = new Date(Date.UTC(today.year, today.month - 2, 1));
  return [
    { key: "this-week", label: "This week", from: toDateInput(thisWeek), to: toDateInput(addDays(thisWeek, 6)) },
    { key: "last-week", label: "Last week", from: toDateInput(lastWeek), to: toDateInput(addDays(lastWeek, 6)) },
    { key: "this-month", label: "This month", from: toDateInput(firstOfMonth), to: toDateInput(addDays(firstOfNext, -1)) },
    { key: "last-month", label: "Last month", from: toDateInput(firstOfLast), to: toDateInput(addDays(firstOfMonth, -1)) },
  ];
}

/** Quick period buttons plus custom from / to dates. */
export function AP_PeriodPicker({ zone, value, onChange }: { zone: string; value: Period; onChange: (p: Period) => void }) {
  const presets = periodPresets(zone);
  const active = presets.find((p) => p.from === value.from && p.to === value.to)?.key;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange({ from: p.from, to: p.to })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active === p.key ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <input
          type="date"
          aria-label="From"
          value={value.from}
          max={value.to}
          onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
          className="field w-auto py-1.5"
        />
        <span>to</span>
        <input
          type="date"
          aria-label="To"
          value={value.to}
          min={value.from}
          onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
          className="field w-auto py-1.5"
        />
      </div>
    </div>
  );
}
