import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DAYS, WEEK_ORDER } from "@/Shared/constants";
import { scheduleKey } from "@/hooks/useSchedule";
import { SaveAvailability } from "@/Shared/SharedService";
import { useApiMutation } from "@/hooks/useApiMutation";
import { AP_Button } from "@/components/AP_Button";
import { AP_Input } from "@/components/AP_Input";
import { AP_Select } from "@/components/AP_Select";

type Row = { key: number; dayOfWeek: number; kind: string; start: string; end: string; note: string };
type DayMode = "windows" | "OFF" | "UNSPECIFIED" | "none";

let nextKey = 1;

export function AP_AvailabilityEditor({
  userId,
  initial,
}: {
  userId: string;
  initial: { dayOfWeek: number; kind: string; start: string; end: string; note: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((r) => ({ ...r, key: nextKey++ })));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useApiMutation((windows: Omit<Row, "key">[]) => SaveAvailability(userId, windows), {
    invalidate: [scheduleKey],
    onSuccess: () => setSaved(true),
  });

  const update = (next: Row[]) => {
    setRows(next);
    setDirty(true);
    setSaved(false);
  };

  const modeOf = (day: number): DayMode => {
    const list = rows.filter((r) => r.dayOfWeek === day);
    if (!list.length) return "none";
    if (list.some((r) => r.kind === "OFF")) return "OFF";
    if (list.some((r) => r.kind === "UNSPECIFIED")) return "UNSPECIFIED";
    return "windows";
  };

  const setMode = (day: number, mode: DayMode) => {
    const others = rows.filter((r) => r.dayOfWeek !== day);
    if (mode === "none") return update(others);
    if (mode === "OFF" || mode === "UNSPECIFIED") {
      return update([...others, { key: nextKey++, dayOfWeek: day, kind: mode, start: "00:00", end: "00:00", note: "" }]);
    }
    update([...others, { key: nextKey++, dayOfWeek: day, kind: "AVAILABLE", start: "18:00", end: "20:00", note: "" }]);
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDirty(false);
    save.mutate(rows.map(({ dayOfWeek, kind, start, end, note }) => ({ dayOfWeek, kind, start, end, note })));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {WEEK_ORDER.map((day) => {
          const mode = modeOf(day);
          const windows = rows.filter((r) => r.dayOfWeek === day);
          return (
            <div key={day} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
              <div className="w-40 shrink-0">
                <p className="text-sm font-semibold text-slate-800">{DAYS[day]}</p>
                <AP_Select
                  value={mode}
                  onChange={(e) => setMode(day, e.target.value as DayMode)}
                  className="mt-1.5 py-1.5 text-xs"
                  aria-label={`${DAYS[day]} status`}
                >
                  <option value="windows">Available at…</option>
                  <option value="UNSPECIFIED">Available, hours unspecified</option>
                  <option value="OFF">Off</option>
                  <option value="none">Not set</option>
                </AP_Select>
              </div>

              <div className="flex-1 space-y-2">
                {mode === "windows" &&
                  windows.map((w) => (
                    <div key={w.key} className="flex flex-wrap items-center gap-2">
                      <AP_Input
                        type="time"
                        value={w.start}
                        step={300}
                        onChange={(e) => update(rows.map((r) => (r.key === w.key ? { ...r, start: e.target.value } : r)))}
                        className="w-28 py-1.5"
                        aria-label="Start"
                      />
                      <span className="text-slate-400">–</span>
                      <AP_Input
                        value={w.end}
                        placeholder="HH:MM"
                        pattern="([01]\d|2[0-3]):[0-5]\d|24:00"
                        title="HH:MM, or 24:00 for midnight"
                        onChange={(e) => update(rows.map((r) => (r.key === w.key ? { ...r, end: e.target.value } : r)))}
                        className="w-24 py-1.5"
                        aria-label="End"
                      />
                      <AP_Select
                        value={w.kind}
                        onChange={(e) => update(rows.map((r) => (r.key === w.key ? { ...r, kind: e.target.value } : r)))}
                        className="w-auto py-1.5 text-xs"
                        aria-label="Type"
                      >
                        <option value="AVAILABLE">Contact window</option>
                        <option value="WORK">Work window</option>
                      </AP_Select>
                      <AP_Input
                        value={w.note}
                        placeholder="Note (optional)"
                        maxLength={200}
                        onChange={(e) => update(rows.map((r) => (r.key === w.key ? { ...r, note: e.target.value } : r)))}
                        className="min-w-40 flex-1 py-1.5"
                        aria-label="Note"
                      />
                      <button
                        type="button"
                        onClick={() => update(rows.filter((r) => r.key !== w.key))}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove window"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                {mode === "windows" && (
                  <button
                    type="button"
                    onClick={() => update([...rows, { key: nextKey++, dayOfWeek: day, kind: "AVAILABLE", start: "", end: "", note: "" }])}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                  >
                    <Plus className="size-3.5" /> Add window
                  </button>
                )}
                {(mode === "OFF" || mode === "UNSPECIFIED") && (
                  <AP_Input
                    value={windows[0]?.note ?? ""}
                    placeholder={mode === "OFF" ? "e.g. Day off" : "e.g. Usually afternoons, confirm by WhatsApp"}
                    maxLength={200}
                    onChange={(e) => update(rows.map((r) => (r.key === windows[0]?.key ? { ...r, note: e.target.value } : r)))}
                    className="max-w-md py-1.5"
                    aria-label="Note"
                  />
                )}
                {mode === "none" && <p className="pt-2 text-xs text-slate-400">No availability entered for this day.</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <AP_Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save availability"}
        </AP_Button>
        {saved && !dirty && <span className="text-sm text-emerald-700">Saved.</span>}
        {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
      </div>
    </form>
  );
}
