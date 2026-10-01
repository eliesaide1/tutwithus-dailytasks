// Meetings: details, form options, create/update/delete (managers) and RSVP (attendees).
import { z } from "zod";
import { Meeting, User, type UserDoc } from "../../Model";
import { isId } from "../../Infrastructure/Database/database";
import { notFound } from "../Common/errors";
import { parse } from "../Common/validation";
import { logActivity, notify } from "../Common/activity";
import { DAYS } from "../Shared/constants";
import { formatRange, parseMinute, weekStartMonday } from "../Shared/time";
import { loadMeetings, loadTeam, meetingConflicts, zoneOptions } from "./ScheduleData";

export const MEETINGS_LINK = "/schedule?tab=meetings";

export function validZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function getMeeting(user: UserDoc, id: string) {
  if (!isId(id)) throw notFound("Meeting not found.");
  const [meeting] = await loadMeetings({ _id: id });
  if (!meeting) throw notFound("Meeting not found.");
  const team = await loadTeam();
  return {
    meeting,
    conflicts: meetingConflicts(meeting, team, weekStartMonday(new Date(), user.timezone)),
  };
}

/** People + zones for the meeting form. */
export async function formOptions() {
  const team = await loadTeam();
  return {
    people: team.map(({ availability: _a, ...p }) => p),
    zones: zoneOptions(team),
  };
}

const hhmm = z
  .string()
  .transform((v) => parseMinute(v))
  .refine((v): v is number => v !== null, "Use HH:MM (24-hour clock).");

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .transform((v) => new Date(`${v}T00:00:00.000Z`));
const optionalIsoDay = z.union([z.literal("").transform(() => null), z.null(), isoDay]).optional();
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const meetingSchema = z
  .object({
    title: z.string().trim().min(2, "Give the meeting a title.").max(120),
    purpose: optText(200),
    agenda: optText(4000),
    location: optText(300),
    recurrence: z.enum(["WEEKLY", "ONCE"]),
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(),
    date: optionalIsoDay,
    start: hhmm,
    end: hhmm,
    timezone: z.string().refine(validZone, "Unknown time zone."),
    validFrom: optionalIsoDay,
    validUntil: optionalIsoDay,
    attendees: z.array(z.string().refine(isId, "Invalid attendee.")).min(1, "Pick at least one attendee."),
  })
  .refine((m) => m.end > m.start, { message: "End time must be after the start time.", path: ["end"] })
  .refine((m) => m.recurrence === "ONCE" || (m.dayOfWeek !== undefined && m.dayOfWeek !== null), {
    message: "Pick a day.",
    path: ["dayOfWeek"],
  })
  .refine((m) => m.recurrence === "WEEKLY" || !!m.date, { message: "Pick a date.", path: ["date"] })
  .refine((m) => !m.validFrom || !m.validUntil || m.validUntil >= m.validFrom, {
    message: "'Valid until' must be after 'Valid from'.",
    path: ["validUntil"],
  });

type MeetingInput = z.infer<typeof meetingSchema>;

function meetingData(m: MeetingInput) {
  return {
    title: m.title,
    purpose: m.purpose,
    agenda: m.agenda,
    location: m.location,
    recurrence: m.recurrence,
    dayOfWeek: m.recurrence === "WEEKLY" ? m.dayOfWeek! : null,
    date: m.recurrence === "ONCE" ? m.date! : null,
    startMinute: m.start,
    endMinute: m.end,
    timezone: m.timezone,
    validFrom: m.recurrence === "WEEKLY" ? (m.validFrom ?? null) : null,
    validUntil: m.recurrence === "WEEKLY" ? (m.validUntil ?? null) : null,
  };
}

function whenText(m: MeetingInput) {
  return m.recurrence === "WEEKLY"
    ? `every ${DAYS[m.dayOfWeek!]} ${formatRange(m.start, m.end)} (${m.timezone})`
    : `${m.date!.toISOString().slice(0, 10)} ${formatRange(m.start, m.end)} (${m.timezone})`;
}

async function checkAttendees(ids: string[]) {
  const unique = [...new Set(ids)];
  const count = await User.countDocuments({ _id: { $in: unique }, active: true });
  if (count !== unique.length) throw notFound("One of the attendees no longer exists.");
  return unique;
}

export async function createMeeting(user: UserDoc, input: unknown) {
  const m = parse(meetingSchema, input);
  const attendees = await checkAttendees(m.attendees);
  const created = await Meeting.create({
    ...meetingData(m),
    organizer: user._id,
    attendees: attendees.map((id) => ({ user: id, status: id === user.id ? "CONFIRMED" : "PENDING" })),
  });
  const when = whenText(m);
  await logActivity({ actor: user.id, entity: "Meeting", entityId: created.id, action: "created", summary: `scheduled "${m.title}" — ${when}`, link: MEETINGS_LINK });
  for (const a of attendees) {
    await notify({ user: a, actor: user.id, title: `New meeting: ${m.title}`, body: `${when}. Please confirm or decline.`, link: `${MEETINGS_LINK}#m-${created.id}` });
  }
  return { id: created.id as string };
}

export async function updateMeeting(user: UserDoc, id: string, input: unknown) {
  if (!isId(id)) throw notFound("Meeting not found.");
  const existing = await Meeting.findById(id);
  if (!existing) throw notFound("This meeting no longer exists.");
  const m = parse(meetingSchema, input);
  const attendees = await checkAttendees(m.attendees);
  // Existing attendees keep their RSVP; new ones start as pending.
  const keep = new Map(existing.attendees.map((a) => [String(a.user), a.status]));
  existing.set({
    ...meetingData(m),
    attendees: attendees.map((uid) => ({ user: uid, status: keep.get(uid) ?? "PENDING" })),
  });
  await existing.save();
  const when = whenText(m);
  await logActivity({ actor: user.id, entity: "Meeting", entityId: existing.id, action: "updated", summary: `updated meeting "${m.title}" — ${when}`, link: MEETINGS_LINK });
  for (const a of attendees) {
    await notify({ user: a, actor: user.id, title: `Meeting updated: ${m.title}`, body: `${when}. Please confirm or decline.`, link: `${MEETINGS_LINK}#m-${existing.id}` });
  }
  return { id: existing.id as string };
}

export async function deleteMeeting(user: UserDoc, id: string) {
  if (!isId(id)) throw notFound("Meeting not found.");
  const meeting = await Meeting.findByIdAndDelete(id);
  if (!meeting) throw notFound("This meeting no longer exists.");
  await logActivity({ actor: user.id, entity: "Meeting", entityId: meeting.id, action: "deleted", summary: `cancelled meeting "${meeting.title}"`, link: MEETINGS_LINK });
  for (const a of meeting.attendees) {
    await notify({ user: a.user, actor: user.id, title: `Meeting cancelled: ${meeting.title}`, link: MEETINGS_LINK });
  }
}

/** Attendee answers for themselves: CONFIRMED | DECLINED | PENDING. */
export async function rsvp(user: UserDoc, id: string, input: unknown) {
  if (!isId(id)) throw notFound("Meeting not found.");
  const { status } = parse(z.object({ status: z.enum(["CONFIRMED", "DECLINED", "PENDING"]) }), input);
  const meeting = await Meeting.findOneAndUpdate(
    { _id: id, "attendees.user": user._id },
    { $set: { "attendees.$.status": status } },
    { new: true },
  );
  if (!meeting) throw notFound("You're not invited to this meeting.");
  const verb = status === "CONFIRMED" ? "confirmed" : status === "DECLINED" ? "declined" : "reset their answer for";
  await logActivity({ actor: user.id, entity: "Meeting", entityId: meeting.id, action: "rsvp", summary: `${verb} "${meeting.title}"`, link: MEETINGS_LINK });
  await notify({ user: meeting.organizer, actor: user.id, title: `${user.name} ${verb} "${meeting.title}"`, link: `${MEETINGS_LINK}#m-${meeting.id}` });
  return { status };
}
