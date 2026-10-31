// Requests (tickets) and their comments. Requests are addressed by `number` (#id).
import { z } from "zod";
import { Activity, Comment, Project, Request, Task, User, nextRequestNumber, type UserDoc } from "../../Model";
import { badRequest, forbidden, notFound } from "../Common/errors";
import { parse, zId } from "../Common/validation";
import { canEditRequest, canManageTasks, canSeeAllTasks, sameId } from "../Common/permissions";
import { logActivity, notify } from "../Common/activity";
import { mailMentioned, mailRequestRaised, mailRequestStatusChanged } from "../Common/mail";
import { isId } from "../../Infrastructure/Database/database";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, TASK_STATUS_LABELS } from "../Shared/constants";
import { dropAttachments } from "./AttachmentCleanup";
import { completeTasksOf } from "./TaskCompletion";
import { approvalOnCreate, approversFor } from "./ApprovalService";
import {
  USER_FIELDS,
  deptLite,
  findRequest,
  idOf,
  requestInput,
  serializeRequest,
  visibleTaskFilter,
  serializeTask,
  taskFields,
  taskInput,
  userLite,
  type Lean,
} from "./TaskMappers";
import { assertInTeam, getProjectTeam } from "./ProjectTeam";

/**
 * Who may open a request: admins, its owner and creator see everything; people with a
 * task in it see only their own tasks. Anyone else gets a 404 (the request isn't revealed).
 *
 * Your connection to the request is the whole test, and the project's department is not
 * part of it. It used to be checked first, which meant a request you raised yourself in
 * another department's project answered 404 the moment you created it — and raising one
 * for another department is exactly what anyone being able to raise a request is for.
 * The check was never doing more than that: every path past it was owner, creator or
 * assignee anyway, so all it could do was deny people who were one of the three.
 */
export async function requestAccess(user: UserDoc, r: { _id: unknown; project?: unknown; owner?: unknown; createdBy?: unknown }) {
  if (canSeeAllTasks(user)) return { full: true };
  if (sameId(idOf(r.owner), user.id) || sameId(idOf(r.createdBy), user.id)) return { full: true };
  if (await Task.exists({ request: r._id, assignee: user.id })) return { full: false };
  // Naming somebody in a comment is an invitation: the email it sends links straight
  // here, so without this the link would answer 404 to the person it was sent to.
  if (await Comment.exists({ request: r._id, "mentions.users": user.id })) return { full: true };
  throw notFound("Request not found");
}

export async function assertRefs(input: { project?: string | null; owner?: string | null; assignees?: (string | null)[] }) {
  if (input.project && !(await Project.exists({ _id: input.project }))) throw badRequest("Choose a valid project.");
  const people = [input.owner, ...(input.assignees ?? [])].filter((v): v is string => !!v);
  if (people.length) {
    const found = await User.countDocuments({ _id: { $in: [...new Set(people)] } });
    if (found !== new Set(people).size) throw badRequest("Choose a valid person.");
  }
}

// ── Tree listing ──

export async function listTree(user: UserDoc, q: Record<string, string | undefined>) {
  const personParam = q.person ?? "all";
  const seeAll = canSeeAllTasks(user);
  // Without full access, the tree is always limited to the viewer's own work.
  const personId = !seeAll || personParam === "me" ? user.id : personParam === "all" || !personParam ? null : personParam;
  if (personId && !isId(personId)) throw badRequest("Invalid person");
  const show = q.show ?? "open";

  const filter: Lean = {};
  if (q.project) {
    if (!isId(q.project)) throw badRequest("Invalid project");
    filter.project = q.project;
  }
  // No department restriction: outside the admins `personId` has already been forced to
  // the viewer, so the tree holds only their own work either way. Restricting by project
  // on top of that hid requests they raised themselves for another department — the one
  // thing it changed, and the wrong one.
  if (personId) {
    const requestIds = await Task.distinct("request", { assignee: personId });
    filter.$or = [{ owner: personId }, { _id: { $in: requestIds } }, ...(seeAll ? [] : [{ createdBy: personId }])];
  }
  // Not-yet-approved requests are not work: they stay out of the tree for everyone except
  // the people who can act on them — the author, and whoever may approve it.
  const approvalFilter: Lean = user.canApproveRequests
    ? { $or: [{ "approval.status": "APPROVED" }, { "approval.status": "PENDING" }] }
    : { $or: [{ "approval.status": "APPROVED" }, { "approval.status": "PENDING", createdBy: user.id }] };

  const statusFilter: Lean =
    show === "open"
      ? { status: { $nin: ["DONE", "CANCELLED"] } }
      : (REQUEST_STATUSES as readonly string[]).includes(show)
        ? { status: show }
        : {};

  const [requests, waitingInfo, waitingPrereq] = await Promise.all([
    Request.find({ ...filter, ...approvalFilter, ...statusFilter })
      .sort({ number: -1 })
      .populate("project", "code name color")
      .populate("owner", "name avatarUrl")
      .lean(),
    Request.countDocuments({ ...filter, status: "WAITING_INFO" }),
    Request.countDocuments({ ...filter, status: "WAITING_PREREQ" }),
  ]);

  const tasks = await Task.find({ request: { $in: requests.map((r) => r._id) }, ...visibleTaskFilter(user) })
    .sort({ order: 1, createdAt: 1 })
    .select("title status dueDate assignee department request order")
    .populate("assignee", "name avatarUrl")
    .populate("department", "name color")
    .lean();
  const byRequest = new Map<string, Lean[]>();
  for (const t of tasks) {
    const k = String(t.request);
    byRequest.set(k, [...(byRequest.get(k) ?? []), t]);
  }

  return {
    scope: seeAll ? "all" : "mine",
    waitingInfo,
    waitingPrereq,
    requests: requests.map((r) => {
      let rt = byRequest.get(String(r._id)) ?? [];
      // With a person filter, show only that person's tasks unless they own (or, for
      // non-admins, created) the request.
      const full = sameId(idOf(r.owner), personId) || (!seeAll && sameId(idOf(r.createdBy), user.id));
      if (personId && !full) rt = rt.filter((t) => sameId(idOf(t.assignee), personId));
      return {
        ...serializeRequest(r, user),
        tasks: rt.map((t) => ({
          id: String(t._id),
          title: t.title,
          status: t.status,
          dueDate: t.dueDate ?? null,
          assignee: userLite(t.assignee),
          department: deptLite(t.department),
        })),
      };
    }),
  };
}

// ── Create ──

const createInput = requestInput.extend({
  tasks: z.array(taskInput).max(50).default([]),
  // Offered only to people who may use it; ignored for anyone else.
  bypassApproval: z.coerce.boolean().default(false),
});

/**
 * Anyone may raise a request — that is what the approval step is for. Only people who
 * skip approval (or may bypass it) get one that opens straight away; everyone else's
 * waits for Gabriel or Elie. Editing and deleting stay admin-only.
 */
export async function createRequest(user: UserDoc, input: unknown) {
  const body = parse(createInput, input);
  await assertRefs({ project: body.project, assignees: body.tasks.map((t) => t.assignee) });
  // The project's department manager owns the request; tasks stay within their team.
  const team = await getProjectTeam(body.project);
  for (const t of body.tasks) assertInTeam(team, t.assignee);
  const owner = team.lead?.id ?? user.id;

  const { tasks, bypassApproval, ...data } = body;
  const number = await nextRequestNumber();
  const approval = approvalOnCreate(user, bypassApproval);
  const request = await Request.create({ ...data, owner, createdBy: user.id, number, approval });
  const created = await Task.insertMany(
    tasks.map((t, i) => ({ ...taskFields(t), assignee: t.assignee ?? team.lead?.id ?? null, request: request._id, order: i, createdBy: user.id })),
  );

  const link = `/tasks/${number}`;
  const pending = approval.status === "PENDING";
  await logActivity({
    actor: user.id,
    entity: "Request",
    entityId: number,
    action: "created",
    summary: `created request #${number} "${request.title}"${pending ? " — waiting for approval" : approval.bypassed ? " — opened without approval (bypass)" : ""}`,
    link,
  });

  if (pending) {
    // Nobody is given work yet: it goes to whoever can approve it.
    const approvers = await approversFor(user.id);
    for (const a of approvers) {
      await notify({ user: a._id, actor: user.id, title: `Approve request #${number}?`, body: request.title, link });
    }
    await mailRequestRaised({ request, author: user, approvers, taskCount: created.length });
  } else {
    await notify({ user: request.owner, actor: user.id, title: `You own request #${number}`, body: request.title, link });
    for (const t of created) {
      await notify({ user: t.assignee, actor: user.id, title: `New task assigned: ${t.title}`, body: `#${number} ${request.title}`, link });
    }
  }
  // Task ids come back in the order they were submitted, so the client can attach the
  // files it collected per row — the tasks only exist now.
  return { number, pending, tasks: created.map((t) => ({ id: String(t._id), title: t.title })) };
}

// ── Detail ──

export async function getRequest(user: UserDoc, numberParam: string) {
  const found = await findRequest(numberParam);
  const { full } = await requestAccess(user, found);
  const [r, allTasks, comments, allActivity] = await Promise.all([
    Request.findById(found._id)
      .populate("project", "code name color")
      .populate("owner", USER_FIELDS)
      .populate("createdBy", "name")
      .lean(),
    Task.find({ request: found._id, ...visibleTaskFilter(user) })
      .sort({ order: 1, createdAt: 1 })
      .populate("assignee", "name avatarUrl")
      .populate("department", "name color")
      .lean(),
    Comment.find({ request: found._id }).sort({ createdAt: 1 }).populate("author", USER_FIELDS).lean(),
    Activity.find({ link: `/tasks/${found.number}` }).sort({ createdAt: -1 }).limit(25).populate("actor", "name").lean(),
  ]);
  // Assignees without full access only see their own tasks and their own task history.
  const tasks = full ? allTasks : allTasks.filter((t) => sameId(idOf(t.assignee), user.id));
  const activity = full ? allActivity : allActivity.filter((a) => a.entity === "Request" || sameId(idOf(a.actor), user.id));
  return {
    request: {
      ...serializeRequest(r!, user),
      partial: !full,
      // Admins and the request's owner (the department manager) may reassign its tasks.
      canAssign: canManageTasks(user) || sameId(idOf(r!.owner), user.id),
      tasks: tasks.map((t) => serializeTask(t, user)),
      comments: comments.map((c) => ({ id: String(c._id), body: c.body, createdAt: c.createdAt, author: userLite(c.author as Lean) })),
    },
    activity: activity.map((a) => ({
      id: String(a._id),
      summary: a.summary,
      createdAt: a.createdAt,
      actor: a.actor ? { name: (a.actor as Lean).name as string } : null,
    })),
  };
}

// ── Update / status / delete ──

export async function updateRequest(user: UserDoc, numberParam: string, input: unknown) {
  const r = await findRequest(numberParam);
  if (!canEditRequest(user, r)) throw forbidden("You cannot edit this request.");
  const body = parse(requestInput, input);
  await assertRefs({ project: body.project });
  // Owner follows the project: moving a request to another project hands it to that manager.
  const team = await getProjectTeam(body.project);
  const owner = team.lead?.id ?? idOf(r.owner);

  const previousOwner = idOf(r.owner);
  r.set({ ...body, owner });
  await r.save();
  const link = `/tasks/${r.number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "updated", summary: `updated request #${r.number}`, link });
  if (owner && !sameId(owner, previousOwner)) {
    await notify({ user: owner, actor: user.id, title: `You now own request #${r.number}`, body: r.title, link });
  }
}

export async function setRequestStatus(user: UserDoc, numberParam: string, input: unknown) {
  const r = await findRequest(numberParam);
  if (!canEditRequest(user, r)) throw forbidden("You cannot change this request.");
  const { status } = parse(z.object({ status: z.enum(REQUEST_STATUSES) }), input);
  if (r.status === status) return;

  const closed = status === "DONE" || status === "CANCELLED";
  const previous = REQUEST_STATUS_LABELS[r.status as keyof typeof REQUEST_STATUS_LABELS] ?? r.status;
  r.status = status;
  r.closedAt = closed ? new Date() : undefined;
  await r.save();
  // Completing a request completes the work in it — the Done report counts tasks, not
  // requests, so leaving them open would both under-report and contradict the request.
  if (status === "DONE") await completeTasksOf(r, user, r.closedAt);
  const link = `/tasks/${r.number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "status", summary: `set request #${r.number} to ${REQUEST_STATUS_LABELS[status]}`, link });
  await notify({ user: r.owner, actor: user.id, title: `#${r.number} is now ${REQUEST_STATUS_LABELS[status]}`, body: r.title, link });
  await mailRequestStatusChanged({
    request: r,
    status: REQUEST_STATUS_LABELS[status],
    previous,
    ownerId: r.owner,
    actor: user,
  });
}

export async function deleteRequest(user: UserDoc, numberParam: string) {
  const r = await findRequest(numberParam);
  if (!canEditRequest(user, r)) throw forbidden("You cannot delete this request.");
  const tasks = await Task.find({ request: r._id }).select("_id attachments").lean();
  const taskIds = tasks.map((t) => t._id);
  await dropAttachments(tasks.flatMap((t) => t.attachments ?? []));
  await Promise.all([
    Comment.deleteMany({ $or: [{ request: r._id }, { task: { $in: taskIds } }] }),
    Task.deleteMany({ request: r._id }),
  ]);
  await r.deleteOne();
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "deleted", summary: `deleted request #${r.number} "${r.title}"` });
}

// ── Comments ──

const commentInput = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(5000, "Comment is too long."),
  // Who was named with /p and /d. Sent as ids rather than parsed out of the text, so a
  // person whose name appears by coincidence is never mailed.
  mentions: z
    .object({ users: z.array(zId).max(20).default([]), departments: z.array(zId).max(20).default([]) })
    .optional()
    .default({ users: [], departments: [] }),
});

export async function addComment(user: UserDoc, numberParam: string, input: unknown) {
  const r = await findRequest(numberParam);
  await requestAccess(user, r);
  const { body, mentions } = parse(commentInput, input);

  // A named department means everybody in it. Resolved now rather than at send time, so
  // the comment records who was actually reached.
  const fromDepartments = mentions.departments.length
    ? await User.find({ active: true, department: { $in: mentions.departments } }).distinct("_id")
    : [];
  const named = [...new Set([...mentions.users, ...fromDepartments.map(String)])].filter((id) => id !== user.id);
  const reachable = named.length ? (await User.find({ _id: { $in: named }, active: true }).select("_id").lean()).map((u) => String(u._id)) : [];

  await Comment.create({
    request: r._id,
    author: user.id,
    body,
    mentions: { users: reachable, departments: mentions.departments },
  });

  const link = `/tasks/${r.number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "commented", summary: `commented on #${r.number}`, link });
  await notify({ user: r.owner, actor: user.id, title: `${user.name} commented on #${r.number}`, body: body.slice(0, 140), link });

  if (reachable.length) {
    for (const id of reachable) {
      await notify({ user: id, actor: user.id, title: `${user.name} mentioned you on #${r.number}`, body: body.slice(0, 140), link });
    }
    // The email carries the request's tasks, because being mentioned means you were not
    // following this and would otherwise have to go and find them.
    const tasks = await Task.find({ request: r._id, "approval.status": "APPROVED" })
      .sort({ order: 1 })
      .select("title status assignee")
      .populate("assignee", "name")
      .lean();
    await mailMentioned({
      request: r,
      author: user,
      comment: body,
      tasks: tasks.map((t) => ({
        title: t.title,
        status: TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS] ?? t.status,
        assignee: (t.assignee as Lean | null)?.name ?? null,
      })),
      userIds: reachable,
    });
  }
}
