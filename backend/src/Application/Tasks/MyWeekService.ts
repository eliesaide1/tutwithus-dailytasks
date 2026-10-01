// One person's week: tasks due that week (by day), planned with no due day, and overdue.
import { Task, User, type UserDoc } from "../../Model";
import { badRequest, forbidden, notFound } from "../Common/errors";
import { canSeeAllTasks } from "../Common/permissions";
import { isId } from "../../Infrastructure/Database/database";
import { addDays, utcToZoned, weekStartMonday } from "../Shared/time";
import { toDateInput } from "../Shared/format";
import { serializeTask, toMonday, type Lean } from "./TaskMappers";
import { visibleRequestFilter } from "./ProjectTeam";

export async function getMyWeek(viewer: UserDoc, q: Record<string, string | undefined>) {
  const personId = q.user || q.person || viewer.id;
  if (!isId(personId)) throw badRequest("Invalid person");
  if (personId !== viewer.id && !canSeeAllTasks(viewer)) throw forbidden("You can only see your own tasks.");
  const person = await User.findById(personId).select("name title avatarUrl timezone weeklyCapacityMins active").lean();
  if (!person) throw notFound("Person not found");

  let weekStart = weekStartMonday(new Date(), person.timezone);
  if (q.week && /^\d{4}-\d{2}-\d{2}$/.test(q.week)) {
    const d = new Date(`${q.week}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) weekStart = toMonday(d);
  }
  const weekEnd = addDays(weekStart, 7);
  const currentWeek = weekStartMonday(new Date(), person.timezone);
  const isCurrentWeek = weekStart.getTime() === currentWeek.getTime();
  const today = utcToZoned(new Date(), person.timezone);

  const populateRequest = {
    path: "request",
    select: "number title project",
    populate: { path: "project", select: "code color" },
  };
  // Outside the admins, only tasks in the viewer's own department's projects.
  const inVisible = await visibleRequestFilter(viewer);
  const scope = inVisible ? { request: inVisible } : {};
  const [weekTasks, overdue] = await Promise.all([
    Task.find({
      ...scope,
      assignee: person._id,
      $or: [{ dueDate: { $gte: weekStart, $lt: weekEnd } }, { plannedWeek: weekStart }],
    })
      .sort({ dueDate: 1, createdAt: 1 })
      .populate(populateRequest)
      .lean(),
    // Overdue only matters when looking at the current week.
    isCurrentWeek
      ? Task.find({ ...scope, assignee: person._id, status: { $ne: "DONE" }, dueDate: { $lt: weekStart } })
          .sort({ dueDate: 1 })
          .populate(populateRequest)
          .lean()
      : Promise.resolve([]),
  ]);

  const toJson = (t: Lean) => {
    const r = t.request as Lean | null;
    return {
      ...serializeTask({ ...t, assignee: null }, viewer),
      request: r
        ? { number: r.number as number, title: r.title as string, project: { code: r.project?.code ?? "", color: r.project?.color ?? "#0b3b8c" } }
        : null,
    };
  };

  return {
    person: {
      id: String(person._id),
      name: person.name,
      title: person.title,
      avatarUrl: person.avatarUrl ?? null,
      timezone: person.timezone,
      weeklyCapacityMins: person.weeklyCapacityMins ?? 0,
    },
    weekStart: toDateInput(weekStart),
    currentWeek: toDateInput(currentWeek),
    isCurrentWeek,
    today: toDateInput(new Date(Date.UTC(today.year, today.month - 1, today.day))),
    tasks: weekTasks.filter((t) => t.request).map(toJson),
    overdue: overdue.filter((t) => t.request).map(toJson),
  };
}
