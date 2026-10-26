// The emails the portal sends, and who gets them.
//
// Only the approval chain is emailed. Everything else — comments, meetings, RSVPs — stays
// an in-app notification, because an inbox that fills with portal noise stops being read,
// and these are the messages that need someone to act outside the app.
//
//   a task raised for someone  -> Gabriel, who is the only person who can approve it
//   Gabriel approves it        -> the person it is for; this is the first they hear of it
//   Gabriel rejects it         -> whoever raised it, with the reason
//   a request raised           -> its approvers (Gabriel or Elie)
//   a request is decided       -> its author, and its new owner on approval
//
// Every send is best-effort: an in-app Notification has already been written by the
// caller, so a mailbox being down never costs anyone the news.
import { User } from "../../Model";
import { config } from "../../Infrastructure/Config/config";
import { sendMail } from "../../Infrastructure/Email/mailer";

type Ref = { toString(): string } | string | null | undefined;

/** Active recipients for a set of user ids, minus anyone without a mailbox. */
async function recipients(ids: Ref[]): Promise<{ name: string; email: string }[]> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return [];
  const users = await User.find({ _id: { $in: unique }, active: true }).select("name email").lean();
  return users.filter((u) => u.email).map((u) => ({ name: u.name, email: u.email }));
}

/** Everyone who may approve tasks raised for other people, except the person who raised it. */
async function taskApprovers(authorId: Ref) {
  const users = await User.find({ active: true, canApproveTasks: true, _id: { $ne: String(authorId ?? "") } })
    .select("name email")
    .lean();
  return users.filter((u) => u.email).map((u) => ({ name: u.name, email: u.email }));
}

const link = (number: number) => `${config.appUrl}/tasks/${number}`;

const signature = "\n\n—\nTutWithUs Team Portal";

/** "#12 Rebuild the pricing page" — how a request is named in every subject line. */
const ref = (r: { number: number; title: string }) => `#${r.number} ${r.title}`;

type RequestLike = { number: number; title: string };
type TaskLike = { title: string; dueDate?: Date | null; estimateMins?: number | null };

function taskDetails(task: TaskLike) {
  const lines: string[] = [];
  if (task.dueDate) lines.push(`Due: ${task.dueDate.toISOString().slice(0, 10)}`);
  if (task.estimateMins) lines.push(`Estimate: ${Math.round((task.estimateMins / 60) * 100) / 100} h`);
  return lines.length ? `\n\n${lines.join("\n")}` : "";
}

// ── Tasks raised for other people ──

/**
 * A task has been raised for someone and is not posted yet. Only the approver is told;
 * the assignee must not learn about work that may never happen.
 */
export async function mailTaskRaised(opts: {
  task: TaskLike;
  request: RequestLike;
  author: { name: string };
  assigneeName: string | null;
  authorId: Ref;
}) {
  const to = await taskApprovers(opts.authorId);
  if (!to.length) return;
  await sendMail({
    to: to.map((r) => r.email),
    subject: `Approve task for ${opts.assigneeName ?? "an unassigned slot"}: ${opts.task.title}`,
    text:
      `${opts.author.name} raised a task for ${opts.assigneeName ?? "nobody in particular"} and it is waiting for your approval.\n\n` +
      `Task: ${opts.task.title}\n` +
      `Request: ${ref(opts.request)}` +
      taskDetails(opts.task) +
      `\n\nNothing has been posted yet — ${opts.assigneeName ?? "the assignee"} has not been told, and it counts towards nobody's week until you approve it.\n\n` +
      `Approve or reject it here: ${link(opts.request.number)}` +
      signature,
  });
}

/** Approved: the person it is for hears about it for the first time. */
export async function mailTaskApproved(opts: {
  task: TaskLike;
  request: RequestLike;
  approver: { name: string };
  assigneeId: Ref;
}) {
  const to = await recipients([opts.assigneeId]);
  if (!to.length) return;
  await sendMail({
    to: to.map((r) => r.email),
    subject: `New task for you: ${opts.task.title}`,
    text:
      `${opts.approver.name} approved a task that has been assigned to you.\n\n` +
      `Task: ${opts.task.title}\n` +
      `Request: ${ref(opts.request)}` +
      taskDetails(opts.task) +
      `\n\nIt is now on your week and counts towards your workload.\n\n` +
      `Open it here: ${link(opts.request.number)}` +
      signature,
  });
}

/** Rejected: only the person who raised it, with the reason they were given. */
export async function mailTaskRejected(opts: {
  task: TaskLike;
  request: RequestLike;
  approver: { name: string };
  authorId: Ref;
  note?: string | null;
}) {
  const to = await recipients([opts.authorId]);
  if (!to.length) return;
  await sendMail({
    to: to.map((r) => r.email),
    subject: `Task not approved: ${opts.task.title}`,
    text:
      `${opts.approver.name} did not approve the task you raised.\n\n` +
      `Task: ${opts.task.title}\n` +
      `Request: ${ref(opts.request)}\n` +
      `Reason: ${opts.note?.trim() || "none given"}\n\n` +
      `Nobody was assigned it and it never became work.\n\n` +
      `See it here: ${link(opts.request.number)}` +
      signature,
  });
}

// ── New requests ──

/** A new request is waiting on its approvers (Gabriel or Elie). */
export async function mailRequestRaised(opts: {
  request: RequestLike & { description?: string | null };
  author: { name: string };
  approvers: { name: string; email: string }[];
  taskCount: number;
}) {
  const to = opts.approvers.filter((a) => a.email);
  if (!to.length) return;
  await sendMail({
    to: to.map((r) => r.email),
    subject: `Approve request ${ref(opts.request)}`,
    text:
      `${opts.author.name} raised a new request and it is waiting for approval.\n\n` +
      `${ref(opts.request)}\n` +
      (opts.request.description ? `\n${opts.request.description}\n` : "") +
      `\n${opts.taskCount} task(s) are attached to it.\n\n` +
      `Until it is approved it is not work: it stays out of the workload, out of everyone's week, and its phases do not open.\n\n` +
      `Approve or reject it here: ${link(opts.request.number)}` +
      signature,
  });
}

/** Approved: the author, and the owner it has landed with. */
export async function mailRequestApproved(opts: {
  request: RequestLike;
  approver: { name: string };
  authorId: Ref;
  ownerId: Ref;
}) {
  const to = await recipients([opts.authorId, opts.ownerId]);
  if (!to.length) return;
  await sendMail({
    to: to.map((r) => r.email),
    subject: `Request approved: ${ref(opts.request)}`,
    text:
      `${opts.approver.name} approved ${ref(opts.request)}.\n\n` +
      `It is now live work: its tasks count towards the week and workload, and its Acceptance phase is open.\n\n` +
      `Open it here: ${link(opts.request.number)}` +
      signature,
  });
}

export async function mailRequestRejected(opts: {
  request: RequestLike;
  approver: { name: string };
  authorId: Ref;
  note?: string | null;
}) {
  const to = await recipients([opts.authorId]);
  if (!to.length) return;
  await sendMail({
    to: to.map((r) => r.email),
    subject: `Request not approved: ${ref(opts.request)}`,
    text:
      `${opts.approver.name} did not approve the request you raised.\n\n` +
      `${ref(opts.request)}\n` +
      `Reason: ${opts.note?.trim() || "none given"}\n\n` +
      `The record is kept, but it never became work.\n\n` +
      `See it here: ${link(opts.request.number)}` +
      signature,
  });
}
