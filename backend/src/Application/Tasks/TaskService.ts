// Tasks inside a request: add, edit, status changes, delete.
import { z } from "zod";
import { Comment, Department, Request, Task, User, type UserDoc } from "../../Model";
import { badRequest, forbidden, notFound } from "../Common/errors";
import { parse, zId } from "../Common/validation";
import { canEditRequest, canEditTask, canManageTasks, sameId } from "../Common/permissions";
import { logActivity, notify } from "../Common/activity";
import { mailTaskApproved, mailTaskRaised, mailTaskRejected } from "../Common/mail";
import { isId } from "../../Infrastructure/Database/database";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../Shared/constants";
import { findRequest, idOf, taskFields, taskInput } from "./TaskMappers";
import { assertRefs } from "./RequestService";
import { getProjectTeam } from "./ProjectTeam";
import { dropAttachments } from "./AttachmentCleanup";

/**
 * Anyone may raise a task for anyone — including across departments, which is why the
 * project-team restriction no longer applies to the assignee.
 *
 * What keeps that safe is the approval step: unless the author skips it (Gabriel), the
 * task is created PENDING. A pending task is not posted — the assignee is not told, it
 * counts towards nobody's week, and it stays out of the reports until approved.
 *
 * Naming departments raises **one task per department** rather than one task several
 * departments share. Each carries its own status, assignee and due date, so Technology
 * finishing leaves Marketing's untouched — which is the whole point, and which a single
 * task cannot express while it has one status. It also means every screen downstream
 * keeps working: each is an ordinary task.
 */
export async function addTask(user: UserDoc, numberParam: string, input: unknown) {
  const r = await findRequest(numberParam);
  const body = parse(taskInput, input);
  await assertRefs({ assignees: [body.assignee] });
  const team = await getProjectTeam(String(r.project));

  // One task per named department, each going to that department's lead; otherwise the
  // single task that was asked for. Ordered as the departments are ordered on the org
  // chart, so the copies read in a predictable order rather than however Mongo replied.
  const wanted = [...new Set(body.departments)];
  const departments = wanted.length ? await Department.find({ _id: { $in: wanted } }).sort({ order: 1, name: 1 }).select("name lead").lean() : [];
  if (departments.length !== wanted.length) throw badRequest("Choose valid departments.");
  const parts = departments.length
    ? departments.map((d) => ({ department: String(d._id), name: d.name, assignee: d.lead ? String(d.lead) : null }))
    : [{ department: null, name: null, assignee: body.assignee ?? team.lead?.id ?? null }];

  const approved = !!user.skipsTaskApproval;
  const count = await Task.countDocuments({ request: r._id });
  const created = await Task.insertMany(
    parts.map((p, i) => ({
      ...taskFields(body),
      assignee: p.assignee,
      department: p.department,
      request: r._id,
      order: count + i,
      createdBy: user.id,
      approval: { status: approved ? "APPROVED" : "PENDING" },
    })),
  );

  const link = `/tasks/${r.number}`;
  const across = departments.length ? ` for ${departments.map((d) => d.name).join(", ")}` : "";
  await logActivity({
    actor: user.id,
    entity: "Task",
    entityId: created[0]!.id,
    action: "created",
    summary: `added task "${body.title}"${across} to #${r.number}${approved ? "" : " — waiting for approval"}`,
    link,
  });

  if (approved) {
    for (const t of created) {
      await notify({ user: t.assignee, actor: user.id, title: `New task assigned: ${t.title}`, body: `#${r.number} ${r.title}`, link });
    }
  } else {
    // The assignees are told nothing yet; it goes to whoever approves tasks.
    for (const a of await User.find({ active: true, canApproveTasks: true, _id: { $ne: user.id } }).select("_id").lean()) {
      await notify({ user: a._id, actor: user.id, title: `Approve task: ${body.title}`, body: `#${r.number} ${r.title}`, link });
    }
    // One email covering the whole fan-out, not one per department.
    const people = await User.find({ _id: { $in: created.map((t) => t.assignee).filter(Boolean) } }).select("name").lean();
    const nameOf = new Map(people.map((u) => [String(u._id), u.name]));
    await mailTaskRaised({
      task: body,
      request: r,
      author: user,
      authorId: user.id,
      parts: created.map((t, i) => ({ department: parts[i]!.name, assigneeName: t.assignee ? (nameOf.get(String(t.assignee)) ?? null) : null })),
    });
  }
  // The first id keeps single-task callers working; `tasks` is what a fan-out needs.
  return { id: created[0]!.id as string, tasks: created.map((t) => ({ id: String(t._id), title: t.title })), pending: !approved };
}

/** Gabriel decides; nobody approves a task they raised themselves. */
async function loadTaskForDecision(user: UserDoc, id: string) {
  const { task, request } = await findTask(id);
  if (!user.canApproveTasks) throw forbidden("Only Gabriel can approve tasks raised for other people.");
  if (String(task.createdBy ?? "") === user.id) throw forbidden("You can't approve a task you raised yourself.");
  if (task.approval.status !== "PENDING") throw badRequest("This task has already been decided.");
  return { task, request };
}

export async function approveTask(user: UserDoc, id: string) {
  const { task, request } = await loadTaskForDecision(user, id);
  task.approval.status = "APPROVED";
  task.approval.decidedBy = user.id as unknown as typeof task.approval.decidedBy;
  task.approval.decidedAt = new Date();
  await task.save();

  const link = `/tasks/${request.number}`;
  await logActivity({ actor: user.id, entity: "Task", entityId: task.id, action: "status", summary: `approved task "${task.title}" on #${request.number}`, link });
  // Only now does the assignee hear about it — in the app and by email.
  await notify({ user: task.assignee, actor: user.id, title: `New task assigned: ${task.title}`, body: `#${request.number} ${request.title}`, link });
  await notify({ user: task.createdBy, actor: user.id, title: `Your task was approved: ${task.title}`, link });
  await mailTaskApproved({ task, request, approver: user, assigneeId: task.assignee });
  return { ok: true };
}

export async function rejectTask(user: UserDoc, id: string, input: unknown) {
  const { task, request } = await loadTaskForDecision(user, id);
  const { note } = parse(z.object({ note: z.string().trim().max(500).optional() }), input);
  task.approval.status = "REJECTED";
  task.approval.decidedBy = user.id as unknown as typeof task.approval.decidedBy;
  task.approval.decidedAt = new Date();
  task.approval.note = note;
  await task.save();

  const link = `/tasks/${request.number}`;
  await logActivity({
    actor: user.id,
    entity: "Task",
    entityId: task.id,
    action: "status",
    summary: `rejected task "${task.title}" on #${request.number}${note ? ` — ${note}` : ""}`,
    link,
  });
  await notify({ user: task.createdBy, actor: user.id, title: `Task not approved: ${task.title}`, body: note || request.title, link });
  await mailTaskRejected({ task, request, approver: user, authorId: task.createdBy, note });
  return { ok: true };
}

async function findTask(id: string) {
  if (!isId(id)) throw notFound("Task not found");
  const task = await Task.findById(id);
  if (!task) throw notFound("Task not found");
  const request = await Request.findById(task.request).select("number title owner project");
  if (!request) throw notFound("Task not found");
  return { task, request };
}

export async function updateTask(user: UserDoc, id: string, input: unknown) {
  const { task, request } = await findTask(id);
  if (!canManageTasks(user)) throw forbidden("Only Charbel, Elie and Gabriel can edit tasks.");
  const body = parse(taskInput, input);
  await assertRefs({ assignees: [body.assignee] });
  // No project-team check. addTask has never had one — a task may be raised for anyone,
  // in any department — and keeping one here meant an existing cross-department task
  // could not be saved at all: editing its due date was refused because of its assignee.

  const previousAssignee = idOf(task.assignee);
  task.set(taskFields(body));
  await task.save();
  const link = `/tasks/${request.number}`;
  await logActivity({ actor: user.id, entity: "Task", entityId: task.id, action: "updated", summary: `updated task "${task.title}" on #${request.number}`, link });
  if (body.assignee && !sameId(body.assignee, previousAssignee)) {
    await notify({ user: body.assignee, actor: user.id, title: `Task assigned to you: ${task.title}`, body: `#${request.number} ${request.title}`, link });
  }
}

export async function setTaskStatus(user: UserDoc, id: string, input: unknown) {
  const { task, request } = await findTask(id);
  if (!canEditTask(user, task)) throw forbidden("You cannot change this task.");
  const { status } = parse(z.object({ status: z.enum(TASK_STATUSES) }), input);
  if (task.status === status) return;

  task.status = status;
  task.completedAt = status === "DONE" ? new Date() : undefined;
  await task.save();
  const link = `/tasks/${request.number}`;
  await logActivity({ actor: user.id, entity: "Task", entityId: task.id, action: "status", summary: `marked "${task.title}" as ${TASK_STATUS_LABELS[status]}`, link });
  if (status === "DONE" || status === "BLOCKED") {
    await notify({ user: request.owner, actor: user.id, title: `Task ${TASK_STATUS_LABELS[status].toLowerCase()}: ${task.title}`, link });
  }
}

export async function deleteTask(user: UserDoc, id: string) {
  const { task, request } = await findTask(id);
  if (!canManageTasks(user)) throw forbidden("Only Charbel, Elie and Gabriel can delete tasks.");
  await Comment.deleteMany({ task: task._id });
  await dropAttachments(task.attachments);
  await task.deleteOne();
  await logActivity({ actor: user.id, entity: "Task", entityId: task.id, action: "deleted", summary: `deleted task "${task.title}" from #${request.number}`, link: `/tasks/${request.number}` });
}

/** Hand a task to someone. Allowed for admins and the request's owner. */
export async function assignTask(user: UserDoc, id: string, input: unknown) {
  const { task, request } = await findTask(id);
  if (!canManageTasks(user) && !sameId(idOf(request.owner), user.id)) {
    throw forbidden("Only the request's owner (the department manager) or an admin can reassign this task.");
  }
  const { assignee } = parse(z.object({ assignee: zId }), input);
  // Same reasoning as updateTask: who may hold a task is not a function of the project.
  if (sameId(idOf(task.assignee), assignee)) return { ok: true };

  task.assignee = assignee as unknown as typeof task.assignee;
  await task.save();
  const link = `/tasks/${request.number}`;
  await logActivity({ actor: user.id, entity: "Task", entityId: task.id, action: "assigned", summary: `assigned "${task.title}" on #${request.number}`, link });
  await notify({ user: assignee, actor: user.id, title: `Task assigned to you: ${task.title}`, body: `#${request.number} ${request.title}`, link });
  return { ok: true };
}
