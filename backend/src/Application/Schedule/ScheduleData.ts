// Loads team + meetings from MongoDB and computes the week views in a display zone.
import { Availability, Meeting, User } from "../../Model";
import { TIMEZONES } from "../Shared/constants";
import { addDays, formatMinute, utcToZoned, zoneLabel } from "../Shared/time";
import {
  availabilitySegments,
  dayColumn,
  fitsAvailability,
  isWorkingKind,
  meetingOccurrence,
  rangeToSegments,
  zoneMismatch,
  type AvailabilityLike,
  type Segment,
} from "./ScheduleLogic";

export type TeamMember = {
  id: string;
  name: string;
  title: string;
  avatarUrl: string | null;
  timezone: string;
  availability: (AvailabilityLike & { id: string })[];
};

/** Active people ordered by department then name, each with their availability windows. */
export async function loadTeam(): Promise<TeamMember[]> {
  const [users, windows] = await Promise.all([
    User.find({ active: true }).populate<{ department: { order: number } | null }>("department", "order").lean(),
    Availability.find().sort({ dayOfWeek: 1, startMinute: 1 }).lean(),
  ]);
  users.sort((a, b) => (a.department?.order ?? 99) - (b.department?.order ?? 99) || a.name.localeCompare(b.name));
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    title: u.title,
    avatarUrl: u.avatarUrl ?? null,
    timezone: u.timezone,
    availability: windows
      .filter((w) => String(w.user) === String(u._id))
      .map((w) => ({
        id: String(w._id),
        dayOfWeek: w.dayOfWeek,
        startMinute: w.startMinute,
        endMinute: w.endMinute,
        kind: w.kind,
        note: w.note ?? null,
      })),
  }));
}

export type MeetingAttendeeView = {
  userId: string;
  name: string;
  timezone: string;
  avatarUrl: string | null;
  status: string;
};

export type MeetingView = {
  id: string;
  title: string;
  purpose: string | null;
  agenda: string | null;
  location: string | null;
  recurrence: string;
  dayOfWeek: number | null;
  date: Date | null;
  startMinute: number;
  endMinute: number;
  timezone: string;
  validFrom: Date | null;
  validUntil: Date | null;
  organizerId: string | null;
  attendees: MeetingAttendeeView[];
};

/** All meetings with attendee details, ordered weekly-first then by day/time. */
export async function loadMeetings(filter: Record<string, unknown> = {}): Promise<MeetingView[]> {
  const meetings = await Meeting.find(filter)
    .populate<{ attendees: { user: { _id: unknown; name: string; timezone: string; avatarUrl?: string | null } | null; status: string }[] }>(
      "attendees.user",
      "name timezone avatarUrl",
    )
    .lean();
  const views = meetings.map((m) => ({
    id: String(m._id),
    title: m.title,
    purpose: m.purpose ?? null,
    agenda: m.agenda ?? null,
    location: m.location ?? null,
    recurrence: m.recurrence,
    dayOfWeek: m.dayOfWeek ?? null,
    date: m.date ?? null,
    startMinute: m.startMinute,
    endMinute: m.endMinute,
    timezone: m.timezone,
    validFrom: m.validFrom ?? null,
    validUntil: m.validUntil ?? null,
    organizerId: m.organizer ? String(m.organizer) : null,
    attendees: m.attendees
      .filter((a) => a.user)
      .map((a) => ({
        userId: String(a.user!._id),
        name: a.user!.name,
        timezone: a.user!.timezone,
        avatarUrl: a.user!.avatarUrl ?? null,
        status: a.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
  // Weekly before one-time, then day (Mon first), date, start time.
  const dayKey = (d: number | null) => (d === null ? 9 : (d + 6) % 7);
  return views.sort(
    (a, b) =>
      (a.recurrence === b.recurrence ? 0 : a.recurrence === "WEEKLY" ? -1 : 1) ||
      dayKey(a.dayOfWeek) - dayKey(b.dayOfWeek) ||
      (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0) ||
      a.startMinute - b.startMinute,
  );
}

export type Occurrence = {
  meeting: MeetingView;
  start: Date;
  end: Date;
  segments: Segment[];
  /** Attendee wall-clock times, e.g. "Sat 14:00-14:45". */
  attendeeTimes: { userId: string; name: string; zone: string; label: string; status: string }[];
  mismatch: boolean;
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function localLabel(start: Date, end: Date, zone: string) {
  const s = utcToZoned(start, zone);
  const e = utcToZoned(end, zone);
  const endText = e.minute === 0 && e.day !== s.day ? "24:00" : formatMinute(e.minute);
  return `${DAY[s.dayOfWeek]} ${formatMinute(s.minute)}-${endText}`;
}

/** Meetings occurring in the week, positioned in `zone`. */
export function weekOccurrences(meetings: MeetingView[], weekStart: Date, zone: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const meeting of meetings) {
    const occ = meetingOccurrence(meeting, weekStart);
    if (!occ) continue;
    out.push({
      meeting,
      start: occ.start,
      end: occ.end,
      segments: rangeToSegments(occ.start, occ.end, zone, weekStart),
      attendeeTimes: meeting.attendees.map((a) => ({
        userId: a.userId,
        name: a.name,
        zone: a.timezone,
        label: localLabel(occ.start, occ.end, a.timezone),
        status: a.status,
      })),
      mismatch: zoneMismatch(
        meeting.timezone,
        meeting.attendees.map((a) => a.timezone),
        occ.start,
      ),
    });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export type DayCell = {
  windows: { start: number; end: number; kind: string; note: string | null }[];
  markers: { kind: string; note: string | null }[];
  meetings: { id: string; title: string; start: number; end: number; status: string }[];
};

/** Per person, per display column (0 = Mon): windows, OFF/UNSPECIFIED markers and meetings. */
export function availabilityGrid(team: TeamMember[], occurrences: Occurrence[], zone: string, weekStart: Date) {
  return team.map((member) => {
    const { availability, ...person } = member;
    const days: DayCell[] = Array.from({ length: 7 }, () => ({ windows: [], markers: [], meetings: [] }));
    for (const a of availability) {
      if (isWorkingKind(a.kind)) {
        for (const s of availabilitySegments(a, member.timezone, zone, weekStart)) {
          days[s.column]!.windows.push({ start: s.start, end: s.end, kind: a.kind, note: a.note ?? null });
        }
      } else {
        days[dayColumn(a.dayOfWeek)]!.markers.push({ kind: a.kind, note: a.note ?? null });
      }
    }
    for (const o of occurrences) {
      const attendee = o.meeting.attendees.find((x) => x.userId === member.id);
      if (!attendee) continue;
      for (const s of o.segments) {
        days[s.column]!.meetings.push({ id: o.meeting.id, title: o.meeting.title, start: s.start, end: s.end, status: attendee.status });
      }
    }
    for (const d of days) {
      d.windows.sort((a, b) => a.start - b.start);
      d.meetings.sort((a, b) => a.start - b.start);
    }
    return { person, days };
  });
}

function weekStartOfDate(d: Date) {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return addDays(day, -((day.getUTCDay() + 6) % 7));
}

/** Attendees for whom the meeting falls outside their availability windows (in their own zone). */
export function meetingConflicts(meeting: MeetingView, team: TeamMember[], weekStart: Date) {
  let ws = weekStart;
  if (meeting.recurrence === "ONCE" && meeting.date) ws = weekStartOfDate(meeting.date);
  else if (meeting.validFrom && meeting.validFrom > addDays(weekStart, 6)) ws = weekStartOfDate(meeting.validFrom);
  let occ = meetingOccurrence(meeting, ws);
  // Weekly meeting not occurring this week (e.g. before validFrom): check the next week.
  if (!occ && meeting.recurrence === "WEEKLY") {
    ws = addDays(ws, 7);
    occ = meetingOccurrence(meeting, ws);
  }
  if (!occ) return [];
  const out: { name: string; local: string }[] = [];
  for (const a of meeting.attendees) {
    const person = team.find((p) => p.id === a.userId);
    if (!person) continue;
    if (!fitsAvailability(occ.start, occ.end, person.availability, person.timezone, ws)) {
      out.push({ name: person.name, local: localLabel(occ.start, occ.end, person.timezone) });
    }
  }
  return out;
}

/** Time zone options: the common list plus every zone used by the team. */
export function zoneOptions(team: { timezone: string }[], at = new Date()) {
  const zones = new Set<string>([...team.map((p) => p.timezone), ...TIMEZONES]);
  return [...zones].map((value) => ({ value, label: zoneLabel(value, at) }));
}
