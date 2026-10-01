import { Meeting, Task, User, type UserDoc } from "../../Model";
import { canSeeAllTasks } from "../Common/permissions";
import { addDays, weekStartMonday } from "../Shared/time";
import { parseDateInput } from "../Shared/format";

// Mirrors "Weekly capacity after scheduled meetings" from the schedule PDF, but live:
// capacity − meetings − planned task estimates for the selected week.
export async function getWorkload(user: UserDoc, week: string | null) {
  const parsed = parseDateInput(week);
  const weekStart = parsed ? weekStartMonday(parsed, "UTC") : weekStartMonday(new Date(), user.timezone);
  const weekEnd = addDays(weekStart, 7);

  const [people, meetings, tasks] = await Promise.all([
    // Without full task access, people only see their own workload.
    User.find(canSeeAllTasks(user) ? { active: true } : { _id: user._id }).populate("department", "name color order").select("name title avatarUrl weeklyCapacityMins department").lean(),
    Meeting.find({
      $or: [
        { recurrence: "WEEKLY", $and: [{ $or: [{ validFrom: null }, { validFrom: { $lt: weekEnd } }] }, { $or: [{ validUntil: null }, { validUntil: { $gte: weekStart } }] }] },
        { recurrence: "ONCE", date: { $gte: weekStart, $lt: weekEnd } },
      ],
    })
      .select("startMinute endMinute attendees")
      .lean(),
    Task.find({
      assignee: { $ne: null },
      $or: [{ plannedWeek: { $gte: weekStart, $lt: weekEnd } }, { plannedWeek: null, dueDate: { $gte: weekStart, $lt: weekEnd } }],
    })
      .select("assignee estimateMins status")
      .lean(),
  ]);

  const rows = people
    .map((p) => {
      const id = String(p._id);
      const meetingMins = meetings
        .filter((m) => m.attendees.some((a) => String(a.user) === id && a.status !== "DECLINED"))
        .reduce((s, m) => s + (m.endMinute - m.startMinute), 0);
      const mine = tasks.filter((t) => String(t.assignee) === id);
      const plannedMins = mine.reduce((s, t) => s + (t.estimateMins ?? 0), 0);
      const doneMins = mine.filter((t) => t.status === "DONE").reduce((s, t) => s + (t.estimateMins ?? 0), 0);
      const dept = p.department as unknown as { name: string; color: string; order: number } | null;
      return {
        id,
        name: p.name,
        title: p.title,
        avatarUrl: p.avatarUrl ?? null,
        department: dept ? { name: dept.name, color: dept.color } : null,
        deptOrder: dept?.order ?? 99,
        capacityMins: p.weeklyCapacityMins ?? 0,
        meetingMins,
        plannedMins,
        doneMins,
        unestimated: mine.filter((t) => !t.estimateMins).length,
        remainingMins: (p.weeklyCapacityMins ?? 0) - meetingMins - plannedMins,
      };
    })
    .sort((a, b) => a.deptOrder - b.deptOrder || a.name.localeCompare(b.name));

  return { weekStart, rows };
}
