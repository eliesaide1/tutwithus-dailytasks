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
import type { Fact } from "../../Infrastructure/Email/layout";

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

/** "#12 Rebuild the pricing page" — how a request is named in every subject line. */
const ref = (r: { number: number; title: string }) => `#${r.number} ${r.title}`;

type RequestLike = { number: number; title: string };
type TaskLike = { title: string; dueDate?: Date | null; estimateMins?: number | null };

/** The facts worth putting above the button: what, where, when, how long. */
function taskFacts(task: TaskLike, request: RequestLike): Fact[] {
  const facts: Fact[] = [{ label: "Task", value: task.title }, { label: "Request", value: ref(request) }];
  if (task.dueDate) facts.push({ label: "Due", value: task.dueDate.toISOString().slice(0, 10) });
  if (task.estimateMins) facts.push({ label: "Estimate", value: `${Math.round((task.estimateMins / 60) * 100) / 100} h` });
  return facts;
}

/** Every message ends with the same way back into the portal. */
const open = (request: RequestLike, label = "Open the request") => ({ label, url: link(request.number) });

// ── Tasks raised for other people ──

/**
 * A task has been raised and is not posted yet. Only the approver is told; the assignees
 * must not learn about work that may never happen.
 *
 * Raising one task across several departments produces one task each, and one email
 * covering all of them — an approver facing four near-identical messages reads none of
 * them properly.
 */
export async function mailTaskRaised(opts: {
  task: TaskLike;
  request: RequestLike;
  author: { name: string };
  authorId: Ref;
  /** One per task created: which department it is for, and who holds it. */
  parts: { department: string | null; assigneeName: string | null }[];
}) {
  const to = await taskApprovers(opts.authorId);
  if (!to.length) return;
  const many = opts.parts.length > 1;
  const who = (p: { department: string | null; assigneeName: string | null }) =>
    p.department ? `${p.department} — ${p.assigneeName ?? "nobody yet"}` : (p.assigneeName ?? "nobody in particular");
  const raisedFor = many ? `${opts.parts.length} departments` : who(opts.parts[0] ?? { department: null, assigneeName: null });

  await sendMail({
    to: to.map((r) => r.email),
    subject: `Approve task for ${raisedFor}: ${opts.task.title}`,
    blocks: {
      heading: "A task is waiting for your approval",
      intro: `${opts.author.name} raised a task${many ? " across several departments" : ` for ${raisedFor}`}.`,
      facts: taskFacts(opts.task, opts.request),
      ...(many
        ? { listTitle: "One task each, so finishing one leaves the others open", list: opts.parts.map((p) => ({ title: who(p) })) }
        : {}),
      action: open(opts.request, "Approve or reject it"),
      note: "Nothing has been posted yet — nobody has been told, and it counts towards nobody's week until you approve it.",
    },
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
    blocks: {
      heading: "A new task is yours",
      intro: `${opts.approver.name} approved a task that has been assigned to you.`,
      facts: taskFacts(opts.task, opts.request),
      action: open(opts.request, "Open the task"),
      note: "It is now on your week and counts towards your workload.",
    },
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
    blocks: {
      heading: "Your task was not approved",
      intro: `${opts.approver.name} did not approve the task you raised.`,
      facts: [
        { label: "Task", value: opts.task.title },
        { label: "Request", value: ref(opts.request) },
        { label: "Reason", value: opts.note?.trim() || "none given" },
      ],
      action: open(opts.request, "See the request"),
      note: "Nobody was assigned it and it never became work.",
    },
  });
}

/**
 * Somebody was named in a comment with /p or /d.
 *
 * The whole point of being mentioned is that you were not following this request, so the
 * email carries what you would otherwise have to go and find: who said it, what they
 * said, and what the request currently holds. The link lands on the request itself.
 *
 * A department mention reaches everyone in it; naming both a department and someone
 * inside it still sends one email, because the recipients are resolved together.
 */
export async function mailMentioned(opts: {
  request: RequestLike;
  author: { id?: string; name: string };
  comment: string;
  tasks: { title: string; status: string; assignee: string | null }[];
  userIds: Ref[];
}) {
  // Never email somebody about naming themselves.
  const to = (await recipients(opts.userIds)).filter((r) => r.email);
  if (!to.length) return;
  const actor = (await recipients([opts.author.id]))[0];

  const taskList = opts.tasks.length
    ? `\n\nWhat this request holds right now:\n${opts.tasks
        .map((t) => `  • ${t.title} — ${t.status}${t.assignee ? `, ${t.assignee}` : ""}`)
        .join("\n")}`
    : "\n\nThis request has no tasks on it yet.";

  await sendMail({
    to: to.map((r) => r.email),
    from: actor ? { name: actor.name, email: actor.email } : undefined,
    subject: `${opts.author.name} mentioned you on ${ref(opts.request)}`,
    blocks: {
      heading: `${opts.author.name} mentioned you`,
      intro: `On ${ref(opts.request)}.`,
      quote: opts.comment,
      listTitle: "What this request holds right now",
      list: opts.tasks.length
        ? opts.tasks.map((t) => ({ title: t.title, meta: `${t.status}${t.assignee ? ` · ${t.assignee}` : ""}` }))
        : [{ title: "No tasks on it yet" }],
      action: open(opts.request),
    },
  });
}

// ── The workflow a request moves through ──

/**
 * Every phase step is reported to the admins — today the CEO, the Project Leader and the
 * CTO — so the three people answerable for delivery can see where work stands without
 * opening the portal. Addressed to the role, not to three names, so it keeps working when
 * someone joins, leaves or changes job.
 *
 * It is sent **as the person who took the step**, so it arrives under their name and a
 * reply goes back to them rather than into a shared mailbox — the admins are reading a
 * report from a colleague, not a notice from a system.
 */
export async function mailPhaseChanged(opts: {
  request: RequestLike;
  /** Short subject tail, e.g. "accepted — now in Planning". */
  headline: string;
  /** What happened, continuing from the actor's name. */
  detail: string;
  actor: { id?: string; name: string };
}) {
  const admins = await User.find({ role: "ADMIN", active: true }).select("name email").lean();
  const to = admins.map((a) => a.email).filter(Boolean);
  if (!to.length) return;
  const actor = (await recipients([opts.actor.id]))[0];
  await sendMail({
    to,
    // Copied to themselves so the step lands in their own inbox as a record, not only in
    // Sent. Dropped when they are an admin and already on the To line.
    cc: actor?.email,
    from: actor ? { name: actor.name, email: actor.email } : undefined,
    subject: `${ref(opts.request)} — ${opts.headline}`,
    blocks: {
      heading: `${ref(opts.request)} — ${opts.headline}`,
      intro: `${opts.actor.name} ${opts.detail}`,
      action: open(opts.request),
    },
  });
}

/**
 * The request's own status was changed by hand — Open, Waiting info, Done and so on, as
 * opposed to a phase step.
 *
 * Addressed to the person in charge of the request, because it is their work that just
 * changed underneath them, with the admins copied so the three answerable for delivery
 * keep the same view they get from the phases. Sent as whoever made the change, so a
 * reply reaches them and not a shared mailbox.
 */
export async function mailRequestStatusChanged(opts: {
  request: RequestLike;
  /** Human label, e.g. "Waiting info". */
  status: string;
  previous: string;
  ownerId: Ref;
  actor: { id?: string; name: string };
}) {
  const admins = await User.find({ role: "ADMIN", active: true }).select("email").lean();
  const actor = (await recipients([opts.actor.id]))[0];
  const owner = (await recipients([opts.ownerId]))[0];
  // With nobody in charge the admins are the audience, so the news still reaches someone.
  const cc = [...admins.map((a) => a.email), actor?.email].filter((e): e is string => !!e);
  const to = owner ? [owner.email] : cc;
  if (!to.length) return;
  await sendMail({
    to,
    cc: owner ? cc : undefined,
    from: actor ? { name: actor.name, email: actor.email } : undefined,
    subject: `${ref(opts.request)} — ${opts.status}`,
    blocks: {
      heading: `${ref(opts.request)} is now ${opts.status}`,
      intro: `${opts.actor.name} changed the status of this request.`,
      facts: [
        { label: "Was", value: opts.previous },
        { label: "Now", value: opts.status },
      ],
      action: open(opts.request),
    },
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
    blocks: {
      heading: "A new request is waiting for approval",
      intro: `${opts.author.name} raised ${ref(opts.request)}.`,
      ...(opts.request.description ? { quote: opts.request.description } : {}),
      facts: [{ label: "Tasks on it", value: String(opts.taskCount) }],
      action: open(opts.request, "Approve or reject it"),
      note: "Until it is approved it is not work: it stays out of the workload, out of everyone's week, and its phases do not open.",
    },
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
    blocks: {
      heading: "Request approved",
      intro: `${opts.approver.name} approved ${ref(opts.request)}.`,
      action: open(opts.request),
      note: "It is now live work: its tasks count towards the week and workload, and its Acceptance phase is open.",
    },
  });
}

/**
 * Rejected — the author alone, from the shared mailbox.
 *
 * Not the person who would have owned it: approval is what makes a request somebody's
 * work, so a rejected one never became theirs and there is nothing to tell them about.
 * They hear about a request when it is approved, not before.
 */
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
    blocks: {
      heading: "Request not approved",
      intro: `${opts.approver.name} did not approve ${ref(opts.request)}.`,
      facts: [{ label: "Reason", value: opts.note?.trim() || "none given" }],
      action: open(opts.request, "See the request"),
      note: "Nothing has been assigned and no work follows from it. The record is kept so the decision stays visible, but it never became work.",
    },
  });
}
