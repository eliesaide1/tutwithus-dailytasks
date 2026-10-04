// Tasks feature helpers: week maths, input schemas (zod) and serialisers.
import { z } from "zod";
import { Request } from "../../Model";
import { notFound } from "../Common/errors";
import { zDate, zId, zRef, zText } from "../Common/validation";
import { canEditRequest, canEditTask, canManageTasks } from "../Common/permissions";
import { PRIORITIES, REQUEST_TYPES } from "../Shared/constants";

const DAY_MS = 86_400_000;

/** Any date -> the Monday (UTC midnight) of its calendar week. */
export function toMonday(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS);
}

/** Hours from a form field ("1.5", 1.5, "", null) -> minutes or null. */
export const zEstimate = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1000) {
      ctx.addIssue({ code: "custom", message: "Estimates must be a number of hours." });
      return z.NEVER;
    }
    return Math.round(n * 60);
  });

export const requestInput = z.object({
  project: z.string({ error: "Choose a project." }).min(1, "Choose a project.").pipe(zId),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: zText(5000),
  type: z.enum(REQUEST_TYPES).default("TASK"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  dueDate: zDate,
});

export const taskInput = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(200),
  kind: z.string().trim().min(1).max(40).default("General"),
  assignee: zRef,
  estimateHours: zEstimate,
  dueDate: zDate,
  plannedWeek: zDate.transform((d) => (d ? toMonday(d) : null)),
  blocker: zText(500),
  description: zText(5000),
});

/** Map validated task input to model fields. */
export function taskFields(t: z.infer<typeof taskInput>) {
  const { estimateHours, ...rest } = t;
  return { ...rest, estimateMins: estimateHours };
}

/** Load a request by its #number or throw 404. */
export async function findRequest(numberParam: string) {
  const number = Number(numberParam);
  if (!Number.isInteger(number) || number < 1) throw notFound("Request not found");
  const r = await Request.findOne({ number });
  if (!r) throw notFound("Request not found");
  return r;
}

// ── Serialisers (lean docs -> lean JSON) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Lean = Record<string, any>;

export const idOf = (v: unknown) => (v ? String((v as Lean)._id ?? v) : null);

export function userLite(u: Lean | null | undefined) {
  if (!u || !u._id) return null;
  return { id: String(u._id), name: u.name as string, avatarUrl: (u.avatarUrl as string) ?? null, title: (u.title as string) ?? undefined };
}

export function projectLite(p: Lean | null | undefined) {
  if (!p || !p._id) return null;
  return { id: String(p._id), code: p.code as string, name: p.name as string, color: p.color as string };
}

type Viewer = { id?: string; role: string };

export function serializeTask(t: Lean, viewer?: Viewer) {
  return {
    id: String(t._id),
    title: t.title,
    description: t.description ?? null,
    kind: t.kind,
    status: t.status,
    estimateMins: t.estimateMins ?? null,
    dueDate: t.dueDate ?? null,
    plannedWeek: t.plannedWeek ?? null,
    blocker: t.blocker ?? null,
    order: t.order ?? 0,
    completedAt: t.completedAt ?? null,
    createdAt: t.createdAt,
    assignee: userLite(t.assignee),
    attachments: ((t.attachments ?? []) as Lean[]).map((a) => ({
      id: String(a._id),
      filename: a.filename as string,
      contentType: (a.contentType as string) ?? "application/octet-stream",
      size: (a.size as number) ?? 0,
      uploadedBy: idOf(a.uploadedBy),
      uploadedAt: a.uploadedAt ?? null,
    })),
    // canEdit: may change the status; canManage: may edit the task's details or delete it.
    canEdit: viewer ? canEditTask(viewer, { assignee: idOf(t.assignee) }) : undefined,
    canManage: viewer ? canManageTasks(viewer) : undefined,
  };
}

export function serializeRequest(r: Lean, viewer?: Viewer) {
  return {
    id: String(r._id),
    number: r.number as number,
    title: r.title as string,
    description: r.description ?? null,
    type: r.type,
    priority: r.priority,
    status: r.status,
    dueDate: r.dueDate ?? null,
    closedAt: r.closedAt ?? null,
    createdAt: r.createdAt,
    project: projectLite(r.project),
    owner: userLite(r.owner),
    createdBy: userLite(r.createdBy),
    canEdit: viewer ? canEditRequest(viewer, { owner: idOf(r.owner), createdBy: idOf(r.createdBy) }) : undefined,
  };
}

export const USER_FIELDS = "name avatarUrl title";
