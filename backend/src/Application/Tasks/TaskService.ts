// Tasks inside a request: add, edit, status changes, delete.
import { z } from "zod";
import { Comment, Request, Task, User, type UserDoc } from "../../Model";
import { badRequest, forbidden, notFound } from "../Common/errors";
import { parse, zId } from "../Common/validation";
import { canEditRequest, canEditTask, canManageTasks, sameId } from "../Common/permissions";
import { logActivity, notify } from "../Common/activity";
import { isId } from "../../Infrastructure/Database/database";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../Shared/constants";
import { findRequest, idOf, taskFields, taskInput } from "./TaskMappers";
import { assertRefs } from "./RequestService";
import { assertInTeam, getProjectTeam } from "./ProjectTeam";
import { dropAttachments } from "./AttachmentCleanup";

/**
 * Anyone may raise a task for anyone — including across departments, which is why the
 * project-team restriction no longer applies to the assignee.
 *
 * What keeps that safe is the approval step: unless the author skips it (Gabriel), the
 * task is created PENDING. A pending task is not posted — the assignee is not told, it
 * counts towards nobody's week, and it stays out of the reports until approved.
 */
export async function addTask(user: UserDoc, numberParam: string, input: unknown) {
  const r = await findRequest(numberParam);
  const body = parse(taskInput, input);
  await assertRefs({ assignees: [body.assignee] });
  const team = await getProjectTeam(String(r.project));

  const approved = !!user.skipsTaskApproval;
  const count = await Task.countDocuments({ request: r._id });
  // Unassigned tasks go to the project's manager, who can hand them to their team.
  const task = await Task.create({
    ...taskFields(body),
    assignee: body.assignee ?? team.lead?.id ?? null,
    request: r._id,
    order: count,
    createdBy: user.id,
    approval: { status: approved ? "APPROVED" : "PENDING" },
  });

  const link = `/tasks/${r.number}`;
  await logActivity({
    actor: user.id,
    entity: "Task",
    entityId: task.id,
    action: "created",
    summary: `added task "${task.title}" to #${r.number}${approved ? "" : " — waiting for approval"}`,
    link,
  });

  if (approved) {
    await notify({ user: task.assignee, actor: user.id, title: `New task assigned: ${task.title}`, body: `#${r.number} ${r.title}`, link });
  } else {
    // The assignee is told nothing yet; it goes to whoever approves tasks.
    for (const a of await User.find({ active: true, canApproveTasks: true, _id: { $ne: user.id } }).select("_id").lean()) {
      await notify({ user: a._id, actor: user.id, title: `Approve task: ${task.title}`, body: `#${r.number} ${r.title}`, link });
    }
  }
  return { id: task.id, pending: !approved };
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
  // Only now does the assignee hear about it.
  await notify({ user: task.assignee, actor: user.id, title: `New task assigned: ${task.title}`, body: `#${request.number} ${request.title}`, link });
  await notify({ user: task.createdBy, actor: user.id, title: `Your task was approved: ${task.title}`, link });
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
  assertInTeam(await getProjectTeam(String(request.project)), body.assignee);

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

/** Hand a task to someone on the project's team. Allowed for admins and the request's owner. */
export async function assignTask(user: UserDoc, id: string, input: unknown) {
  const { task, request } = await findTask(id);
  if (!canManageTasks(user) && !sameId(idOf(request.owner), user.id)) {
    throw forbidden("Only the request's owner (the department manager) or an admin can reassign this task.");
  }
  const { assignee } = parse(z.object({ assignee: zId }), input);
  assertInTeam(await getProjectTeam(String(request.project)), assignee);
  if (sameId(idOf(task.assignee), assignee)) return { ok: true };

  task.assignee = assignee as unknown as typeof task.assignee;
  await task.save();
  const link = `/tasks/${request.number}`;
  await logActivity({ actor: user.id, entity: "Task", entityId: task.id, action: "assigned", summary: `assigned "${task.title}" on #${request.number}`, link });
  await notify({ user: assignee, actor: user.id, title: `Task assigned to you: ${task.title}`, body: `#${request.number} ${request.title}`, link });
  return { ok: true };
}
