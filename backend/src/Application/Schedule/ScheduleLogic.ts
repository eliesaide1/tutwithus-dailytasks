// Pure scheduling logic: meeting occurrences, availability conversion, overlap search.
// Everything resolves to real instants for a concrete week, then back to the display zone,
// so DST differences between zones (e.g. Beirut vs Riyadh after 25 Oct) are respected.
import { addDays, tzOffsetMinutes, utcToZoned, zonedToUtc } from "../Shared/time";

const DAY_MS = 86_400_000;

export type MeetingLike = {
  id: string;
  recurrence: string;
  dayOfWeek?: number | null;
  date?: Date | null;
  startMinute: number;
  endMinute: number;
  timezone: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
};

export type AvailabilityLike = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  kind: string;
  note?: string | null;
};

/** A block on one display day (column 0 = Monday of the displayed week). */
export type Segment = { column: number; start: number; end: number };

/** UTC-midnight date for a zoned calendar day. */
function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

/** Real start/end instants of a meeting in the week starting Monday `weekStart`, or null. */
export function meetingOccurrence(m: MeetingLike, weekStart: Date) {
  let date: Date;
  if (m.recurrence === "ONCE") {
    if (!m.date) return null;
    date = utcDate(m.date.getUTCFullYear(), m.date.getUTCMonth() + 1, m.date.getUTCDate());
    if (date < weekStart || date >= addDays(weekStart, 7)) return null;
  } else {
    if (m.dayOfWeek == null) return null;
    date = addDays(weekStart, (m.dayOfWeek + 6) % 7);
    if (m.validFrom && date < dayOnly(m.validFrom)) return null;
    if (m.validUntil && date > dayOnly(m.validUntil)) return null;
  }
  const start = zonedToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), m.startMinute, m.timezone);
  const end = new Date(start.getTime() + (m.endMinute - m.startMinute) * 60_000);
  return { date, start, end };
}

function dayOnly(d: Date) {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Map an instant range to display-day segments in `zone`, relative to `weekStart`.
 * Splits at local midnight; drops parts outside the displayed week.
 */
export function rangeToSegments(start: Date, end: Date, zone: string, weekStart: Date): Segment[] {
  const out: Segment[] = [];
  let cursor = start;
  while (cursor < end) {
    const p = utcToZoned(cursor, zone);
    const column = Math.round((utcDate(p.year, p.month, p.day).getTime() - weekStart.getTime()) / DAY_MS);
    const remaining = Math.round((end.getTime() - cursor.getTime()) / 60_000);
    const segEnd = Math.min(1440, p.minute + remaining);
    if (column >= 0 && column < 7 && segEnd > p.minute) out.push({ column, start: p.minute, end: segEnd });
    const advance = segEnd - p.minute;
    if (advance <= 0) break;
    cursor = new Date(cursor.getTime() + advance * 60_000);
  }
  return out;
}

/** An availability window (local to `fromZone`) for the given week, as display segments in `zone`. */
export function availabilitySegments(a: AvailabilityLike, fromZone: string, zone: string, weekStart: Date) {
  const date = addDays(weekStart, (a.dayOfWeek + 6) % 7);
  const start = zonedToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), a.startMinute, fromZone);
  const end = new Date(start.getTime() + (a.endMinute - a.startMinute) * 60_000);
  return rangeToSegments(start, end, zone, weekStart);
}

/** Column (0 = Mon) for a whole-day marker (OFF / UNSPECIFIED) — the same calendar day. */
export function dayColumn(dayOfWeek: number) {
  return (dayOfWeek + 6) % 7;
}

export const isWorkingKind = (kind: string) => kind === "AVAILABLE" || kind === "WORK";

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

/** Offset differences between a meeting's anchor zone and its attendees' zones at `instant`. */
export function zoneMismatch(anchor: string, zones: string[], instant: Date) {
  const base = tzOffsetMinutes(anchor, instant);
  return zones.some((z) => tzOffsetMinutes(z, instant) !== base);
}

/**
 * True when the meeting instant range fits inside one of the person's working windows
 * (windows are local to `zone`; adjacent weeks are checked for cross-week edges).
 */
export function fitsAvailability(start: Date, end: Date, windows: AvailabilityLike[], zone: string, weekStart: Date) {
  for (let offset = -1; offset <= 1; offset++) {
    const ws = addDays(weekStart, offset * 7);
    for (const w of windows) {
      if (!isWorkingKind(w.kind)) continue;
      const date = addDays(ws, (w.dayOfWeek + 6) % 7);
      const ws0 = zonedToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), w.startMinute, zone);
      const we0 = new Date(ws0.getTime() + (w.endMinute - w.startMinute) * 60_000);
      if (ws0 <= start && we0 >= end) return true;
    }
  }
  return false;
}

/** "YYYY-MM-DD" of a UTC-midnight date. */
export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Parse ?week=YYYY-MM-DD and snap it to its Monday; null when invalid. */
export function parseWeekParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return addDays(d, -((d.getUTCDay() + 6) % 7));
}
