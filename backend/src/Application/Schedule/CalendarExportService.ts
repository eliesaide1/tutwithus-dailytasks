// iCalendar (RFC 5545) export of a user's meetings, for Google/Apple/Outlook import.
import { Meeting, User, type UserDoc } from "../../Model";
import { loadMeetings, type MeetingView } from "./ScheduleData";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Local floating time "YYYYMMDDTHHMMSS" for a calendar date + minutes (used with TZID). */
function localStamp(date: Date, minute: number) {
  const d = new Date(date.getTime() + Math.floor(minute / 1440) * 86_400_000);
  const m = minute % 1440;
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    if (size + len > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** First date on/after `from` that falls on `dayOfWeek`. */
function firstOnOrAfter(from: Date, dayOfWeek: number) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return new Date(d.getTime() + ((dayOfWeek - d.getUTCDay() + 7) % 7) * 86_400_000);
}

function buildIcs(
  calendarName: string,
  meetings: (MeetingView & { createdAt?: Date })[],
  emails: Map<string, string>,
) {
  const now = utcStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TutWithUs//Team Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const m of meetings) {
    let first: Date;
    if (m.recurrence === "ONCE") {
      if (!m.date) continue;
      first = m.date;
    } else {
      if (m.dayOfWeek === null) continue;
      first = firstOnOrAfter(m.validFrom ?? m.createdAt ?? new Date(), m.dayOfWeek);
    }
    const description = [m.purpose, m.agenda].filter(Boolean).join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@portal.tutwithus.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${m.timezone}:${localStamp(first, m.startMinute)}`,
      `DTEND;TZID=${m.timezone}:${localStamp(first, m.endMinute)}`,
      `SUMMARY:${escapeText(m.title)}`,
    );
    if (m.recurrence === "WEEKLY") {
      const until = m.validUntil ? `;UNTIL=${utcStamp(new Date(m.validUntil.getTime() + 86_399_000))}` : "";
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[m.dayOfWeek!]}${until}`);
    }
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (m.location) lines.push(`LOCATION:${escapeText(m.location)}`);
    for (const a of m.attendees) {
      const partstat = a.status === "CONFIRMED" ? "ACCEPTED" : a.status === "DECLINED" ? "DECLINED" : "NEEDS-ACTION";
      const email = emails.get(a.userId);
      lines.push(`ATTENDEE;CN=${escapeText(a.name)};PARTSTAT=${partstat}:mailto:${email ?? "unknown@tutwithus.com"}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The signed-in user's non-declined meetings as an .ics file. */
export async function exportMeetings(user: UserDoc) {
  const meetings = await Meeting.find({ attendees: { $elemMatch: { user: user._id, status: { $ne: "DECLINED" } } } }).select("_id createdAt");
  const views = await loadMeetings({ _id: { $in: meetings.map((m) => m._id) } });
  const created = new Map(meetings.map((m) => [String(m._id), m.get("createdAt") as Date]));
  const userIds = [...new Set(views.flatMap((v) => v.attendees.map((a) => a.userId)))];
  const people = await User.find({ _id: { $in: userIds } }).select("email");
  const body = buildIcs(
    `TutWithUs – ${user.name}`,
    views.map((v) => ({ ...v, createdAt: created.get(v.id) })),
    new Map(people.map((p) => [p.id as string, p.email])),
  );
  return { filename: "tutwithus-meetings.ics", body };
}
