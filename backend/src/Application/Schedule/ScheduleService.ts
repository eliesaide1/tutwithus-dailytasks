// Week view: everything the schedule page needs for one week in one display zone.
import type { UserDoc } from "../../Model";
import { utcToZoned, weekStartMonday } from "../Shared/time";
import { availabilityGrid, loadMeetings, loadTeam, localLabel, meetingConflicts, weekOccurrences, zoneOptions } from "./ScheduleData";
import { isoDate, meetingOccurrence, parseWeekParam } from "./ScheduleLogic";

export async function getWeek(user: UserDoc, query: { week?: string; tz?: string }) {
  const [team, meetings] = await Promise.all([loadTeam(), loadMeetings()]);
  const zones = zoneOptions(team);
  const tzParam = query.tz ?? "";
  const zone = tzParam && zones.some((z) => z.value === tzParam) ? tzParam : user.timezone;

  const now = new Date();
  const currentWeek = weekStartMonday(now, zone);
  const weekStart = parseWeekParam(query.week) ?? currentWeek;

  const today = utcToZoned(now, zone);
  const todayIdx = Math.round((Date.UTC(today.year, today.month - 1, today.day) - weekStart.getTime()) / 86_400_000);

  const occurrences = weekOccurrences(meetings, weekStart, zone);

  return {
    week: isoDate(weekStart),
    currentWeek: isoDate(currentWeek),
    zone,
    zoneLabel: zones.find((z) => z.value === zone)?.label ?? zone,
    zones,
    todayColumn: todayIdx >= 0 && todayIdx < 7 ? todayIdx : null,
    occurrences: occurrences.map((o) => ({
      meetingId: o.meeting.id,
      start: o.start,
      end: o.end,
      segments: o.segments,
      attendeeTimes: o.attendeeTimes,
      mismatch: o.mismatch,
    })),
    rows: availabilityGrid(team, occurrences, zone, weekStart),
    meetings: meetings.map((m) => {
      const occ = meetingOccurrence(m, weekStart);
      return {
        ...m,
        occurrence: occ ? { start: occ.start, end: occ.end, local: localLabel(occ.start, occ.end, zone) } : null,
        conflicts: meetingConflicts(m, team, weekStart),
      };
    }),
  };
}
