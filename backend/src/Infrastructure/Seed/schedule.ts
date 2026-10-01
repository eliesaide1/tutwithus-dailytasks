import { Availability, Meeting } from "../../Model";
import type { People } from "./people";

// "18:30" -> 1110
const t = (s: string) => {
  const [hh, mm] = s.split(":").map(Number);
  return hh! * 60 + mm!;
};
const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;

type Slot = [day: number, start: string, end: string, kind?: string, note?: string];

export async function seedSchedule(p: People) {
  // Daily availability from the Team Work Schedule v9 (page 2), in each person's local time.
  const availability: Record<string, Slot[]> = {
    [p.gabriel.id]: [
      ...[MON, TUE, WED, THU, FRI].map((d): Slot => [d, "17:30", "19:30", "AVAILABLE", "Extension to 20:00 by prior arrangement"]),
      [SAT, "12:00", "15:00", "AVAILABLE", "Extension to 16:00 by prior arrangement"],
      [SUN, "12:00", "15:00", "AVAILABLE", "Extension to 16:00 by prior arrangement"],
    ],
    [p.thiago.id]: [
      ...[SAT, SUN, MON, TUE, WED, THU].map((d): Slot => [d, "10:00", "18:00", "WORK"]),
      [FRI, "00:00", "00:00", "OFF", "Day off"],
    ],
    [p.rodolphe.id]: [
      [MON, "18:00", "20:00"],
      [TUE, "17:30", "19:00"],
      [WED, "18:00", "20:00"],
      [THU, "18:00", "20:00"],
      [FRI, "00:00", "00:00", "UNSPECIFIED", "Hours unspecified - confirm before booking"],
      [SAT, "13:00", "17:00"],
      [SUN, "18:00", "19:30"],
    ],
    [p.charbel.id]: [
      ...[MON, TUE, WED, THU, SUN].map((d): Slot => [d, "20:00", "23:00"]),
      [FRI, "11:00", "17:00"],
      [SAT, "11:00", "17:00"],
    ],
    [p.silvana.id]: [
      [MON, "10:10", "11:55", "AVAILABLE", "Break during employment hours"],
      [MON, "17:30", "21:30"],
      [TUE, "08:40", "09:30", "AVAILABLE", "Break during employment hours"],
      [TUE, "11:05", "11:55", "AVAILABLE", "Break during employment hours"],
      [TUE, "17:30", "21:30"],
      [WED, "08:40", "09:30", "AVAILABLE", "Break during employment hours"],
      [WED, "12:45", "13:35", "AVAILABLE", "Break during employment hours"],
      [THU, "08:40", "09:30", "AVAILABLE", "Break during employment hours"],
      [THU, "15:30", "24:00"],
      [FRI, "00:00", "00:00", "UNSPECIFIED", "Available; hours unspecified"],
      [SAT, "00:00", "00:00", "UNSPECIFIED", "Available; hours unspecified"],
      [SUN, "08:40", "09:30"],
      [SUN, "10:10", "11:00"],
      [SUN, "14:30", "15:30"],
      [SUN, "17:30", "21:30"],
    ],
    [p.elie.id]: [
      ...[MON, TUE, WED, THU, FRI].map((d): Slot => [d, "18:00", "21:00", "WORK", "Support anytime via WhatsApp"]),
      [SAT, "10:00", "14:00", "WORK", "Support anytime via WhatsApp"],
    ],
  };

  for (const [userId, slots] of Object.entries(availability)) {
    await Availability.insertMany(
      slots.map(([dayOfWeek, start, end, kind = "AVAILABLE", note]) => ({
        user: userId,
        dayOfWeek,
        startMinute: t(start),
        endMinute: t(end),
        kind,
        note,
      })),
    );
  }

  // Recurring meetings (page 1). Anchored to Beirut time, as in the PDF.
  const validFrom = new Date("2026-10-01T00:00:00Z");
  const meetings: {
    title: string;
    purpose: string;
    day: number;
    start: string;
    end: string;
    attendees: { id: string; status?: string }[];
    agenda: string;
  }[] = [
    {
      title: "Gabriel + Thiago check-in",
      purpose: "Marketing and sales priorities",
      day: MON,
      start: "18:30",
      end: "19:00",
      attendees: [{ id: p.gabriel.id }, { id: p.thiago.id }],
      agenda: CHECKIN_AGENDA,
    },
    {
      title: "Gabriel + Silvana check-in",
      purpose: "Tutor and client follow-up",
      day: TUE,
      start: "18:30",
      end: "19:00",
      attendees: [{ id: p.gabriel.id }, { id: p.silvana.id }],
      agenda: CHECKIN_AGENDA,
    },
    {
      title: "Gabriel + Thiago check-in",
      purpose: "Campaign progress and next actions",
      day: THU,
      start: "18:00",
      end: "18:30",
      attendees: [{ id: p.gabriel.id }, { id: p.thiago.id }],
      agenda: CHECKIN_AGENDA,
    },
    {
      title: "Gabriel + Silvana check-in",
      purpose: "Operational progress and blockers",
      day: THU,
      start: "18:30",
      end: "19:00",
      attendees: [{ id: p.gabriel.id }, { id: p.silvana.id }],
      agenda: CHECKIN_AGENDA,
    },
    {
      title: "Saturday team meeting",
      purpose: "Results, decisions and next week",
      day: SAT,
      start: "13:00",
      end: "13:45",
      attendees: [
        { id: p.gabriel.id },
        { id: p.thiago.id },
        { id: p.rodolphe.id },
        { id: p.silvana.id, status: "PENDING" },
        { id: p.charbel.id },
        { id: p.elie.id },
      ],
      agenda:
        "5 min action review\n15 min team results\n15 min decisions and blockers\n10 min next-week commitments\n\nRecord each action as: owner | deliverable | due date | status | blocker.",
    },
  ];

  const created = [];
  for (const m of meetings) {
    created.push(
      await Meeting.create({
        title: m.title,
        purpose: m.purpose,
        agenda: m.agenda,
        recurrence: "WEEKLY",
        dayOfWeek: m.day,
        startMinute: t(m.start),
        endMinute: t(m.end),
        timezone: "Asia/Beirut",
        validFrom,
        organizer: p.gabriel._id,
        attendees: m.attendees.map((a) => ({ user: a.id, status: a.status ?? "CONFIRMED" })),
      }),
    );
  }
  return created;
}

const CHECKIN_AGENDA =
  "10 min completed work\n5 min blockers\n10 min next deliverables\n5 min confirm owner and deadline\n\nBring evidence or links. Move deeper work into a separate working session.";
