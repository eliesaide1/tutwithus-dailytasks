// Dashboard data for the signed-in user.
import { Activity, Announcement, Meeting, Task, User, type UserDoc } from "../../Model";
import { canSeeAllTasks } from "../Common/permissions";
import { addDays, convertWeeklySlot, formatRange, utcToZoned, weekStartMonday } from "../Shared/time";
import { DAYS } from "../Shared/constants";
import { toActivityRow } from "./ActivityService";
import { visibleRequestFilter } from "../Tasks/ProjectTeam";

/** Everything the dashboard shows for `user`: own tasks, upcoming meetings, news, activity, team overview. */
export async function getDashboard(user: UserDoc) {
  const now = new Date();
  const weekStart = weekStartMonday(now, user.timezone);
  const weekEnd = addDays(weekStart, 7);

  // Outside the admins, only tasks in the user's own department's projects.
  const inVisible = await visibleRequestFilter(user);
  const [myTasks, meetings, announcements, activity, team] = await Promise.all([
    Task.find({ ...(inVisible ? { request: inVisible } : {}), assignee: user._id, status: { $ne: "DONE" } })
      .populate({ path: "request", select: "number title priority project", populate: { path: "project", select: "code color" } })
      .sort({ dueDate: 1, createdAt: 1 })
      .lean({ virtuals: false }),
    Meeting.find({ attendees: { $elemMatch: { user: user._id, status: { $ne: "DECLINED" } } } })
      .populate("attendees.user", "name avatarUrl")
      .lean(),
    Announcement.find().sort({ pinned: -1, createdAt: -1 }).limit(3).populate("author", "name").lean(),
    // Team activity is only for the admins (Charbel, Elie, Gabriel).
    canSeeAllTasks(user)
      ? Activity.find().sort({ createdAt: -1 }).limit(8).populate("actor", "name avatarUrl").lean()
      : Promise.resolve([]),
    canSeeAllTasks(user) ? teamOverview(now) : Promise.resolve([]),
  ]);

  // Tasks without a due date sort last.
  myTasks.sort((a, b) => (a.dueDate ? a.dueDate.getTime() : Infinity) - (b.dueDate ? b.dueDate.getTime() : Infinity));

  // Next occurrences of my meetings over the coming 7 days, in my time zone.
  const upcoming = meetings
    .flatMap((m) => {
      const out = [];
      for (const ws of [weekStart, weekEnd]) {
        let slot: { dayOfWeek: number; startMinute: number; endMinute: number } | null = null;
        let anchorWeek = weekStartMonday(addDays(ws, 3), m.timezone);
        if (m.recurrence === "WEEKLY" && m.dayOfWeek !== null && m.dayOfWeek !== undefined) {
          slot = { dayOfWeek: m.dayOfWeek, startMinute: m.startMinute, endMinute: m.endMinute };
        } else if (m.date && ws === weekStart) {
          slot = { dayOfWeek: m.date.getUTCDay(), startMinute: m.startMinute, endMinute: m.endMinute };
          anchorWeek = weekStartMonday(m.date, "UTC");
        }
        if (!slot) continue;
        const c = convertWeeklySlot(slot, m.timezone, user.timezone, anchorWeek);
        if (m.validFrom && c.start < m.validFrom) continue;
        if (m.validUntil && c.start > addDays(m.validUntil, 1)) continue;
        if (c.start.getTime() + 60 * 60_000 < now.getTime() || c.start > addDays(now, 7)) continue;
        out.push({
          id: String(m._id),
          title: m.title,
          start: c.start,
          time: formatRange(c.startMinute, c.endMinute),
          day: DAYS[utcToZoned(c.start, user.timezone).dayOfWeek],
          attendees: m.attendees.map((a) => {
            const u = a.user as unknown as { _id: unknown; name: string; avatarUrl?: string } | null;
            return { id: String(u?._id ?? a.user), name: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl ?? null };
          }),
        });
      }
      return out;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  const tasks = myTasks.map((t) => {
    const r = t.request as unknown as { number: number; title: string; priority: string; project: { code: string; color: string } };
    return {
      id: String(t._id),
      title: t.title,
      status: t.status,
      dueDate: t.dueDate ?? null,
      request: { number: r.number, title: r.title, priority: r.priority, project: r.project },
    };
  });

  return {
    stats: {
      open: tasks.length,
      dueThisWeek: tasks.filter((t) => t.dueDate && t.dueDate >= weekStart && t.dueDate < weekEnd).length,
      overdue: tasks.filter((t) => t.dueDate && t.dueDate < now).length,
      blocked: tasks.filter((t) => t.status === "BLOCKED").length,
    },
    tasks: tasks.slice(0, 8),
    meetings: upcoming,
    announcements: announcements.map((a) => ({
      id: String(a._id),
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      createdAt: a.createdAt,
      author: (a.author as unknown as { name: string } | null)?.name ?? null,
    })),
    activity: activity.map(toActivityRow),
    team,
  };
}

async function teamOverview(now: Date) {
  const [people, open] = await Promise.all([
    User.find({ active: true }).sort({ name: 1 }).select("name title avatarUrl").lean(),
    Task.find({ status: { $ne: "DONE" }, assignee: { $ne: null } }).select("assignee status dueDate").lean(),
  ]);
  return people.map((p) => {
    const mine = open.filter((t) => String(t.assignee) === String(p._id));
    return {
      id: String(p._id),
      name: p.name,
      title: p.title,
      avatarUrl: p.avatarUrl ?? null,
      open: mine.length,
      overdue: mine.filter((t) => t.dueDate && t.dueDate < now).length,
      blocked: mine.filter((t) => t.status === "BLOCKED").length,
    };
  });
}
