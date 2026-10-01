// Timezone helpers built on Intl (no extra dependency). Weekly schedule entries are
// stored as (dayOfWeek, minute) in an anchor zone; to show them to someone in another
// zone we resolve them to a real instant for a concrete week, so DST changes (e.g.
// Beirut leaving summer time on 25 Oct 2026 while Riyadh stays at UTC+3) are handled.

const DAY_MS = 86_400_000;

/** Offset of `zone` from UTC at `instant`, in minutes (Beirut summer -> 180). */
export function tzOffsetMinutes(zone: string, instant: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0; // "GMT" = UTC
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** The UTC instant for local wall time `minute` on y-m-d in `zone`. */
export function zonedToUtc(y: number, m: number, d: number, minute: number, zone: string) {
  const guess = Date.UTC(y, m - 1, d, 0, minute);
  let result = guess - tzOffsetMinutes(zone, new Date(guess)) * 60_000;
  // Second pass corrects for an offset change between guess and result.
  result = guess - tzOffsetMinutes(zone, new Date(result)) * 60_000;
  return new Date(result);
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sunday
  minute: number; // minutes from local midnight
};

export function utcToZoned(instant: Date, zone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dayOfWeek: weekday,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Calendar date (as a UTC-midnight Date) of the Monday of the week containing `instant` in `zone`. */
export function weekStartMonday(instant: Date, zone: string) {
  const p = utcToZoned(instant, zone);
  const today = Date.UTC(p.year, p.month - 1, p.day);
  const back = (p.dayOfWeek + 6) % 7; // days since Monday
  return new Date(today - back * DAY_MS);
}

/** Calendar date (UTC midnight) for `dayOfWeek` in the week starting on Monday `weekStart`. */
export function dateInWeek(weekStart: Date, dayOfWeek: number) {
  const offset = (dayOfWeek + 6) % 7;
  return new Date(weekStart.getTime() + offset * DAY_MS);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Resolve a weekly slot (dayOfWeek/minutes in `fromZone`) for the week starting `weekStart`
 * into `toZone`. The result may land on a different day; end may exceed 1440 only if the
 * slot crosses midnight in the target zone.
 */
export function convertWeeklySlot(
  slot: { dayOfWeek: number; startMinute: number; endMinute: number },
  fromZone: string,
  toZone: string,
  weekStart: Date,
) {
  const date = dateInWeek(weekStart, slot.dayOfWeek);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const start = zonedToUtc(y, m, d, slot.startMinute, fromZone);
  const end = new Date(start.getTime() + (slot.endMinute - slot.startMinute) * 60_000);
  const s = utcToZoned(start, toZone);
  return {
    start,
    end,
    dayOfWeek: s.dayOfWeek,
    startMinute: s.minute,
    endMinute: s.minute + (slot.endMinute - slot.startMinute),
  };
}

/** 1110 -> "18:30"; 1440 -> "24:00" */
export function formatMinute(minute: number) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "18:30" -> 1110; accepts "24:00". Returns null for invalid input. */
export function parseMinute(text: string | null | undefined) {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

export function formatRange(start: number, end: number) {
  return `${formatMinute(start)}-${formatMinute(end)}`;
}

/** Short label for a zone, e.g. "Beirut (UTC+3)". */
export function zoneLabel(zone: string, at = new Date()) {
  const off = tzOffsetMinutes(zone, at);
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  const city = zone.split("/").pop()!.replace(/_/g, " ");
  return `${city} (UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, "0")}` : ""})`;
}
