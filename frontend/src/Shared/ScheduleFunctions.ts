// Client-side helpers: week arithmetic on "YYYY-MM-DD" strings and interval maths for "Find a time".

const DAY_MS = 86_400_000;

/** "2026-10-05" shifted by n days. */
export function shiftDate(iso: string, days: number) {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** UTC-midnight Date for column `col` (0 = Monday) of the week starting `week`. */
export function columnDate(week: string, col: number) {
  return new Date(new Date(`${week}T00:00:00Z`).getTime() + col * DAY_MS);
}

export const shortDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const zoneCity = (zone: string) => zone.split("/").pop()?.replace(/_/g, " ") ?? zone;

// ── Interval maths (minutes within one day) ──

export type Interval = [number, number];

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [as, ae] of a) {
    for (const [bs, be] of b) {
      const s = Math.max(as, bs);
      const e = Math.min(ae, be);
      if (e > s) out.push([s, e]);
    }
  }
  return mergeIntervals(out);
}

export function subtract(a: Interval[], b: Interval[]): Interval[] {
  let result = mergeIntervals(a);
  for (const [bs, be] of mergeIntervals(b)) {
    const next: Interval[] = [];
    for (const [s, e] of result) {
      if (be <= s || bs >= e) next.push([s, e]);
      else {
        if (bs > s) next.push([s, bs]);
        if (be < e) next.push([be, e]);
      }
    }
    result = next;
  }
  return result;
}
