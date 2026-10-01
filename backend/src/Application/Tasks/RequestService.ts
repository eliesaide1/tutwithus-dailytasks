// Requests (tickets) and their comments. Requests are addressed by `number` (#id).
import { z } from "zod";
import { Activity, Comment, Project, Request, Task, User, nextRequestNumber, type UserDoc } from "../../Model";
import { badRequest, forbidden, notFound } from "../Common/errors";
import { parse } from "../Common/validation";
import { canEditRequest, canManageTasks, canSeeAllTasks, sameId } from "../Common/permissions";
import { logActivity, notify } from "../Common/activity";
import { isId } from "../../Infrastructure/Database/database";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS } from "../Shared/constants";
import {
  USER_FIELDS,
  findRequest,
  idOf,
  requestInput,
  serializeRequest,
  serializeTask,
  taskFields,
  taskInput,
  userLite,
  type Lean,
} from "./TaskMappers";
import { assertInTeam, getProjectTeam, visibleProjectIds } from "./ProjectTeam";

/**
 * Who may open a request: admins, its owner and creator see everything; people with a
 * task in it see only their own tasks. Anyone else gets a 404 (the request isn't revealed).
 */
export async function requestAccess(user: UserDoc, r: { _id: unknown; project?: unknown; owner?: unknown; createdBy?: unknown }) {
  if (canSeeAllTasks(user)) return { full: true };
  // Outside the admins, only requests in your own department's projects exist for you.
  const visible = (await visibleProjectIds(user)) ?? [];
  if (!visible.includes(String(idOf(r.project)))) throw notFound("Request not found");
  if (sameId(idOf(r.owner), user.id) || sameId(idOf(r.createdBy), user.id)) return { full: true };
  if (await Task.exists({ request: r._id, assignee: user.id })) return { full: false };
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
  // Outside the admins, only your own department's projects.
  const visible = await visibleProjectIds(user);
  if (visible) filter.project = q.project ? (visible.includes(q.project) ? q.project : { $in: [] }) : { $in: visible };
  if (personId) {
    const requestIds = await Task.distinct("request", { assignee: personId });
    filter.$or = [{ owner: personId }, { _id: { $in: requestIds } }, ...(seeAll ? [] : [{ createdBy: personId }])];
  }
  const statusFilter: Lean =
    show === "open"
      ? { status: { $nin: ["DONE", "CANCELLED"] } }
      : (REQUEST_STATUSES as readonly string[]).includes(show)
        ? { status: show }
        : {};

  const [requests, waitingInfo, waitingPrereq] = await Promise.all([
    Request.find({ ...filter, ...statusFilter })
      .sort({ number: -1 })
      .populate("project", "code name color")
      .populate("owner", "name avatarUrl")
      .lean(),
    Request.countDocuments({ ...filter, status: "WAITING_INFO" }),
    Request.countDocuments({ ...filter, status: "WAITING_PREREQ" }),
  ]);

  const tasks = await Task.find({ request: { $in: requests.map((r) => r._id) } })
    .sort({ order: 1, createdAt: 1 })
    .select("title status dueDate assignee request order")
    .populate("assignee", "name avatarUrl")
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
        ...serializeRequest(r),
        tasks: rt.map((t) => ({
          id: String(t._id),
          title: t.title,
          status: t.status,
          dueDate: t.dueDate ?? null,
          assignee: userLite(t.assignee),
        })),
      };
    }),
  };
}

// ── Create ──

const createInput = requestInput.extend({ tasks: z.array(taskInput).max(50).default([]) });

export async function createRequest(user: UserDoc, input: unknown) {
  if (!canManageTasks(user)) throw forbidden("Only Charbel, Elie and Gabriel can create tasks.");
  const body = parse(createInput, input);
  await assertRefs({ project: body.project, assignees: body.tasks.map((t) => t.assignee) });
  // The project's department manager owns the request; tasks stay within their team.
  const team = await getProjectTeam(body.project);
  for (const t of body.tasks) assertInTeam(team, t.assignee);
  const owner = team.lead?.id ?? user.id;

  const { tasks, ...data } = body;
  const number = await nextRequestNumber();
  const request = await Request.create({ ...data, owner, createdBy: user.id, number });
  const created = await Task.insertMany(
    tasks.map((t, i) => ({ ...taskFields(t), assignee: t.assignee ?? team.lead?.id ?? null, request: request._id, order: i, createdBy: user.id })),
  );

  const link = `/tasks/${number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: number, action: "created", summary: `created request #${number} "${request.title}"`, link });
  await notify({ user: request.owner, actor: user.id, title: `You own request #${number}`, body: request.title, link });
  for (const t of created) {
    await notify({ user: t.assignee, actor: user.id, title: `New task assigned: ${t.title}`, body: `#${number} ${request.title}`, link });
  }
  return { number };
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
    Task.find({ request: found._id }).sort({ order: 1, createdAt: 1 }).populate("assignee", "name avatarUrl").lean(),
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
  r.status = status;
  r.closedAt = closed ? new Date() : undefined;
  await r.save();
  const link = `/tasks/${r.number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "status", summary: `set request #${r.number} to ${REQUEST_STATUS_LABELS[status]}`, link });
  await notify({ user: r.owner, actor: user.id, title: `#${r.number} is now ${REQUEST_STATUS_LABELS[status]}`, body: r.title, link });
}

export async function deleteRequest(user: UserDoc, numberParam: string) {
  const r = await findRequest(numberParam);
  if (!canEditRequest(user, r)) throw forbidden("You cannot delete this request.");
  const taskIds = await Task.find({ request: r._id }).distinct("_id");
  await Promise.all([
    Comment.deleteMany({ $or: [{ request: r._id }, { task: { $in: taskIds } }] }),
    Task.deleteMany({ request: r._id }),
  ]);
  await r.deleteOne();
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "deleted", summary: `deleted request #${r.number} "${r.title}"` });
}

// ── Comments ──

export async function addComment(user: UserDoc, numberParam: string, input: unknown) {
  const r = await findRequest(numberParam);
  await requestAccess(user, r);
  const { body } = parse(z.object({ body: z.string().trim().min(1, "Write a comment first.").max(5000, "Comment is too long.") }), input);
  await Comment.create({ request: r._id, author: user.id, body });
  const link = `/tasks/${r.number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "commented", summary: `commented on #${r.number}`, link });
  await notify({ user: r.owner, actor: user.id, title: `${user.name} commented on #${r.number}`, body: body.slice(0, 140), link });
}
