// Who owns a project's work and who may be given its tasks.
//
// A project belongs to a department (DEV → Technology, MKT → Marketing & Content …). The
// department's manager (its lead) owns every request in the project, and its tasks can
// only go to that department's people (the manager and the department's members).
// Except for the admins, people only see the projects of their own department.
import type { Types } from "mongoose";
import { Department, Project, Request, User, type UserDoc } from "../../Model";
import { canSeeAllTasks } from "../Common/permissions";
import { badRequest, notFound } from "../Common/errors";
import { isId } from "../../Infrastructure/Database/database";

type Person = { id: string; name: string; title: string; avatarUrl: string | null };

export type ProjectTeam = {
  /** The department manager who owns the project's requests (null if the project has no team lead). */
  lead: Person | null;
  department: { id: string; name: string } | null;
  /** Everyone a task may be assigned to, manager first. */
  members: Person[];
};

const toPerson = (u: { _id: Types.ObjectId | unknown; name: string; title: string; avatarUrl?: string | null }): Person => ({
  id: String(u._id),
  name: u.name,
  title: u.title,
  avatarUrl: u.avatarUrl ?? null,
});

export async function getProjectTeam(projectId: string): Promise<ProjectTeam> {
  if (!isId(projectId)) throw notFound("Project not found");
  const project = await Project.findById(projectId).select("department").lean();
  if (!project) throw notFound("Project not found");

  const people = await User.find({ active: true }).select("name title avatarUrl manager department").sort({ name: 1 }).lean();
  const dept = project.department ? await Department.findById(project.department).select("name lead").lean() : null;

  // No team (or no manager) on the project: anyone can be picked.
  if (!dept?.lead) {
    return { lead: null, department: dept ? { id: String(dept._id), name: dept.name } : null, members: people.map(toPerson) };
  }

  const leadId = String(dept.lead);
  const team = people.filter((p) => String(p._id) === leadId || String(p.department) === String(dept._id));
  const lead = team.find((p) => String(p._id) === leadId);
  return {
    lead: lead ? toPerson(lead) : null,
    department: { id: String(dept._id), name: dept.name },
    members: [...(lead ? [lead] : []), ...team.filter((p) => String(p._id) !== leadId)].map(toPerson),
  };
}

/** Throws a clear 400 when someone outside the project's team is picked. */
export function assertInTeam(team: ProjectTeam, assignee: string | null | undefined) {
  if (!assignee) return;
  if (!team.members.some((m) => m.id === assignee)) {
    const who = team.lead ? `${team.lead.name}'s team${team.department ? ` (${team.department.name})` : ""}` : "this project's team";
    throw badRequest(`Tasks in this project can only be assigned to ${who}.`);
  }
}

/**
 * Projects someone may see in Tasks, My week and the dashboard: everything for the admins
 * (returns null), otherwise only the projects of their own department.
 */
export async function visibleProjectIds(user: UserDoc): Promise<string[] | null> {
  if (canSeeAllTasks(user)) return null;
  if (!user.department) return [];
  return (await Project.find({ department: user.department }).distinct("_id")).map(String);
}

/** Mongo filter on Task.request for the requests in those projects (null = no limit). */
export async function visibleRequestFilter(user: UserDoc) {
  const projects = await visibleProjectIds(user);
  if (!projects) return null;
  return { $in: await Request.find({ project: { $in: projects } }).distinct("_id") };
}
