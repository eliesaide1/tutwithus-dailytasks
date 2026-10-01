// Directory, org chart and profiles.
import { z } from "zod";
import { Availability, Department, Task, User, type UserDoc } from "../../Model";
import { isId } from "../../Infrastructure/Database/database";
import { forbidden, HttpError, notFound } from "../Common/errors";
import { parse, zRef, zText } from "../Common/validation";
import { canSeeAllTasks, isManager, sameId } from "../Common/permissions";
import { logActivity } from "../Common/activity";
import { departmentList, deptJson, loadOrgPeople, validZone, wouldCreateCycle } from "./helpers";

/** Directory: active people with contact details. */
export async function listPeople() {
  const [users, departments] = await Promise.all([
    User.find({ active: true })
      .sort({ name: 1 })
      .select("name title email phone whatsapp avatarUrl timezone department manager")
      .populate("department", "name color")
      .populate("manager", "name"),
    departmentList(),
  ]);
  return { people: users, departments: departments.map(deptJson) };
}

export async function getOrgChart() {
  const [people, departments] = await Promise.all([loadOrgPeople(), departmentList()]);
  return { people, departments: departments.map(deptJson) };
}

export async function getProfile(viewer: UserDoc, id: string) {
  if (!isId(id)) throw notFound("Person not found.");
  const person = await User.findById(id).populate("department", "name color").populate("manager", "name title avatarUrl");
  if (!person) throw notFound("Person not found.");

  const now = new Date();
  const [reports, availability, openTasks, overdueTasks] = await Promise.all([
    User.find({ manager: person._id, active: true }).sort({ name: 1 }).select("name title avatarUrl"),
    Availability.find({ user: person._id }).sort({ dayOfWeek: 1, startMinute: 1 }),
    Task.countDocuments({ assignee: person._id, status: { $ne: "DONE" } }),
    Task.countDocuments({ assignee: person._id, status: { $ne: "DONE" }, dueDate: { $lt: now } }),
  ]);

  return {
    person,
    reports,
    availability,
    // Task counts are only shown to the person themselves and to admins.
    stats: sameId(viewer.id, person.id) || canSeeAllTasks(viewer) ? { openTasks, overdueTasks } : null,
    canEdit: sameId(viewer.id, person.id) || isManager(viewer),
  };
}

const optional = (max = 2000) => zText(max);

const basicSchema = z.object({
  phone: optional(60),
  whatsapp: optional(60),
  bio: optional(),
  avatarUrl: optional(1000).refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "Photo must be a URL"),
  timezone: z.string().trim().min(1, "Pick a time zone").refine(validZone, "Unknown time zone."),
});

const managerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  title: z.string().trim().min(1, "Title is required").max(120),
  manager: zRef,
  department: zRef,
  responsibilities: optional(),
  urgentContact: optional(500),
  weeklyCapacityHours: z.coerce.number().min(0).max(80),
});

/** Everyone edits their own contact fields; managers also edit role & reporting fields. */
export async function updateProfile(viewer: UserDoc, id: string, input: unknown) {
  if (!isId(id)) throw notFound("Person not found.");
  const manager = isManager(viewer);
  if (!sameId(viewer.id, id) && !manager) throw forbidden("You can only edit your own profile.");

  const person = await User.findById(id);
  if (!person) throw notFound("Person not found.");

  const basic = parse(basicSchema, input);
  Object.assign(person, basic);

  if (manager) {
    const extra = parse(managerSchema, input);
    if (await wouldCreateCycle(id, extra.manager)) {
      throw new HttpError(400, "That manager reports to this person (directly or indirectly). Pick someone else.");
    }
    if (extra.department && !(await Department.exists({ _id: extra.department }))) throw new HttpError(400, "Unknown team.");
    const { weeklyCapacityHours, ...rest } = extra;
    Object.assign(person, rest, { weeklyCapacityMins: Math.round(weeklyCapacityHours * 60) });
  }

  await person.save();
  await logActivity({
    actor: viewer.id,
    entity: "User",
    entityId: id,
    action: "updated",
    summary: sameId(viewer.id, id) ? "updated their profile" : `updated ${person.name}'s profile`,
    link: `/people/${id}`,
  });
  return person;
}
