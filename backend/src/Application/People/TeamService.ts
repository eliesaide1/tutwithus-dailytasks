// Teams (departments): listing, detail, create/edit/delete and membership.
import { Types } from "mongoose";
import { z } from "zod";
import { Department, Project, Task, User, type UserDoc } from "../../Model";
import { isId } from "../../Infrastructure/Database/database";
import { HttpError, notFound } from "../Common/errors";
import { parse, zId, zRef } from "../Common/validation";
import { canSeeAllTasks, isManager } from "../Common/permissions";
import { logActivity } from "../Common/activity";
import { loadOrgPeople } from "./helpers";

/** Open (not done) tasks per assignee id. */
async function openTasksByUser(userIds: (string | Types.ObjectId)[]) {
  // Aggregations don't cast, so make sure ids are ObjectIds.
  const ids = userIds.map((id) => (typeof id === "string" ? new Types.ObjectId(id) : id));
  const rows = await Task.aggregate<{ _id: unknown; count: number }>([
    { $match: { status: { $ne: "DONE" }, assignee: { $in: ids } } },
    { $group: { _id: "$assignee", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

export async function listTeams(viewer: UserDoc) {
  const seeTasks = canSeeAllTasks(viewer);
  const [teams, members, unassigned] = await Promise.all([
    Department.find().sort({ order: 1, name: 1 }).populate("lead", "name title avatarUrl"),
    User.find({ active: true, department: { $ne: null } }).sort({ name: 1 }).select("name avatarUrl department").lean(),
    User.countDocuments({ active: true, department: null }),
  ]);
  const openBy = await openTasksByUser(members.map((m) => m._id));

  return {
    unassigned,
    teams: teams.map((t) => {
      const mine = members.filter((m) => String(m.department) === t.id);
      return {
        ...t.toJSON(),
        members: mine.map((m) => ({ id: String(m._id), name: m.name, avatarUrl: m.avatarUrl ?? null })),
        openTasks: seeTasks ? mine.reduce((sum, m) => sum + (openBy.get(String(m._id)) ?? 0), 0) : null,
      };
    }),
  };
}

export async function getTeam(viewer: UserDoc, id: string) {
  if (!isId(id)) throw notFound("Team not found.");
  const team = await Department.findById(id);
  if (!team) throw notFound("Team not found.");

  const [members, projects, others, memberCount, projectCount] = await Promise.all([
    loadOrgPeople({ department: team.id }),
    Project.find({ department: team._id, archived: false }).sort({ code: 1 }).select("code name color"),
    isManager(viewer)
      ? User.find({ active: true, department: { $ne: team._id } }).sort({ name: 1 }).select("name department").populate("department", "name")
      : Promise.resolve([]),
    User.countDocuments({ department: team._id }),
    Project.countDocuments({ department: team._id }),
  ]);
  const openBy = await openTasksByUser(members.map((m) => m.id));

  return {
    team,
    members,
    openTasks: canSeeAllTasks(viewer) ? Object.fromEntries(members.map((m) => [m.id, openBy.get(m.id) ?? 0])) : null,
    projects,
    others,
    counts: { members: memberCount, projects: projectCount },
  };
}

const teamSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
  lead: zRef,
  order: z.coerce.number().int().min(0).max(999),
});

/** Create (id = null) or update a team. */
export async function saveTeam(actor: UserDoc, id: string | null, input: unknown) {
  if (id !== null && !isId(id)) throw notFound("Team not found.");
  const data = parse(teamSchema, input);
  const clash = await Department.findOne({ name: data.name, ...(id ? { _id: { $ne: id } } : {}) });
  if (clash) throw new HttpError(409, "A team with that name already exists.");
  if (data.lead && !(await User.exists({ _id: data.lead }))) throw new HttpError(400, "Unknown team lead.");

  let team;
  if (id) {
    team = await Department.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!team) throw notFound("Team not found.");
  } else {
    team = await Department.create(data);
  }
  // The lead belongs to the team they lead.
  if (team.lead) await User.updateOne({ _id: team.lead }, { department: team._id });

  await logActivity({
    actor: actor.id,
    entity: "Department",
    entityId: team.id,
    action: id ? "updated" : "created",
    summary: `${id ? "updated" : "created"} team "${team.name}"`,
    link: `/teams/${team.id}`,
  });
  return team;
}

export async function deleteTeam(actor: UserDoc, id: string) {
  if (!isId(id)) throw notFound("Team not found.");
  const team = await Department.findByIdAndDelete(id);
  if (!team) throw notFound("Team not found.");
  // Members and projects are kept but no longer belong to a team.
  await Promise.all([
    User.updateMany({ department: team._id }, { department: null }),
    Project.updateMany({ department: team._id }, { department: null }),
  ]);
  await logActivity({ actor: actor.id, entity: "Department", entityId: team.id, action: "deleted", summary: `deleted team "${team.name}"` });
}

export async function addMember(actor: UserDoc, teamId: string, input: unknown) {
  if (!isId(teamId)) throw notFound("Team not found.");
  const { userId } = parse(z.object({ userId: zId }), input);
  const team = await Department.findById(teamId);
  if (!team) throw notFound("Team not found.");
  const user = await User.findByIdAndUpdate(userId, { department: team._id }, { new: true });
  if (!user) throw notFound("Person not found.");
  // Moving a team's lead elsewhere leaves that team without a lead.
  await Department.updateMany({ _id: { $ne: team._id }, lead: user._id }, { lead: null });
  await logActivity({
    actor: actor.id,
    entity: "Department",
    entityId: team.id,
    action: "updated",
    summary: `moved ${user.name} to ${team.name}`,
    link: `/teams/${team.id}`,
  });
}

export async function removeMember(actor: UserDoc, teamId: string, userId: string) {
  if (!isId(teamId) || !isId(userId)) throw notFound();
  const team = await Department.findById(teamId);
  if (!team) throw notFound("Team not found.");
  const user = await User.findOneAndUpdate({ _id: userId, department: team._id }, { department: null }, { new: true });
  if (!user) throw notFound("That person is not in this team.");
  if (team.lead && String(team.lead) === user.id) {
    team.lead = null;
    await team.save();
  }
  await logActivity({
    actor: actor.id,
    entity: "Department",
    entityId: team.id,
    action: "updated",
    summary: `removed ${user.name} from ${team.name}`,
    link: `/teams/${team.id}`,
  });
}
