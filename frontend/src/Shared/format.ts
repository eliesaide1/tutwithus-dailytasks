export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 90 -> "1 h 30 min", 45 -> "45 min", 120 -> "2 h" */
export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Compact age like DQtasks: "3 d, 6.1 h ago" / "in 2 d, 4.0 h". Accepts Date or ISO string. */
export function formatAge(date: Date | string, now = new Date()) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - now.getTime();
  const future = diffMs > 0;
  const hoursTotal = Math.abs(diffMs) / 3_600_000;
  const days = Math.floor(hoursTotal / 24);
  const h = hoursTotal - days * 24;
  const text = days > 0 ? `${days} d, ${h.toFixed(1)} h` : `${h.toFixed(1)} h`;
  return future ? `in ${text}` : `${text} ago`;
}

/** Date -> "YYYY-MM-DD" (UTC) for <input type="date"> values and ?week= params. */
export function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** "2026-10-03" -> Date at UTC midnight, or null. */
export function parseDateInput(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(`${v.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "3 Oct" style short date in UTC (for calendar dates stored at UTC midnight). */
export function formatShortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
