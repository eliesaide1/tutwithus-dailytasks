// File attachments on a task. Three steps, because the bytes never touch this server:
//
//   1. presign()  -> the client asks for permission; we hand back a short-lived PUT URL
//   2. (browser uploads straight to object storage)
//   3. confirm()  -> we verify the object really landed, then record it on the task
//
// Step 2 happening outside our control is why confirm() re-reads the object's true size
// from storage rather than trusting the size the client claimed.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Request, Task, type UserDoc } from "../../Model";
import { badRequest, forbidden, notFound, HttpError } from "../Common/errors";
import { parse } from "../Common/validation";
import { canEditTask, canManageTasks } from "../Common/permissions";
import { logActivity } from "../Common/activity";
import { isId } from "../../Infrastructure/Database/database";
import { config } from "../../Infrastructure/Config/config";
import { deleteObject, headObject, isStorageConfigured, presignDownload, presignUpload } from "../../Infrastructure/Storage/storage";

// Kept deliberately narrow: documents, images and archives people actually attach to work.
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/zip",
]);

const MAX_PER_TASK = 20;

const presignInput = z.object({
  filename: z.string().trim().min(1, "File name is required.").max(200),
  contentType: z.string().trim().min(1).max(150),
  size: z.number().int().positive("The file is empty."),
});

const confirmInput = z.object({
  key: z.string().trim().min(1).max(300),
  filename: z.string().trim().min(1).max(200),
});

function assertStorage() {
  if (!isStorageConfigured()) {
    throw new HttpError(503, "File attachments are not set up on this server yet.", "STORAGE_UNCONFIGURED");
  }
}

/** Strip anything that could confuse a storage key or a Content-Disposition header. */
function safeName(name: string) {
  return (
    name
      .replace(/[/\\]/g, "-")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f"]/g, "")
      .trim()
      .slice(-120) || "file"
  );
}

async function loadTask(id: string) {
  if (!isId(id)) throw notFound("Task not found");
  const task = await Task.findById(id);
  if (!task) throw notFound("Task not found");
  const request = await Request.findById(task.request).select("number title owner project");
  if (!request) throw notFound("Task not found");
  return { task, request };
}

/**
 * Who may add or remove files: admins, or the person the task is assigned to. This
 * mirrors canEditTask — if you can move a task forward, you can attach the evidence.
 */
function assertCanAttach(user: UserDoc, task: { assignee?: unknown }) {
  if (!canEditTask(user, { assignee: task.assignee as string | null })) {
    throw forbidden("You can only attach files to your own tasks.");
  }
}

export async function presign(user: UserDoc, taskId: string, input: unknown) {
  assertStorage();
  const { task, request } = await loadTask(taskId);
  assertCanAttach(user, task);

  const body = parse(presignInput, input);
  if (body.size > config.maxAttachmentBytes) {
    throw badRequest(`Files must be ${Math.round(config.maxAttachmentBytes / 1024 / 1024)} MB or smaller.`);
  }
  if (!ALLOWED_TYPES.has(body.contentType)) {
    throw badRequest("That file type isn't allowed. Use a PDF, Office document, image, text file or zip.");
  }
  if (task.attachments.length >= MAX_PER_TASK) {
    throw badRequest(`A task can hold at most ${MAX_PER_TASK} files.`);
  }

  // Server-chosen key: the client can never overwrite another task's file.
  const key = `tasks/${request.number}/${task.id}/${randomUUID()}-${safeName(body.filename)}`;
  const { url, expiresIn } = await presignUpload(key, body.contentType);
  return { uploadUrl: url, key, contentType: body.contentType, expiresIn };
}

export async function confirm(user: UserDoc, taskId: string, input: unknown) {
  assertStorage();
  const { task, request } = await loadTask(taskId);
  assertCanAttach(user, task);
  const body = parse(confirmInput, input);

  // The key must belong to this task — otherwise a client could attach someone else's file.
  if (!body.key.startsWith(`tasks/${request.number}/${task.id}/`)) throw badRequest("That upload doesn't belong to this task.");
  if (task.attachments.some((a) => a.key === body.key)) throw badRequest("That file is already attached.");

  const head = await headObject(body.key);
  if (!head) throw badRequest("The upload didn't complete. Please try again.");
  if (head.size > config.maxAttachmentBytes) {
    await deleteObject(body.key);
    throw badRequest(`Files must be ${Math.round(config.maxAttachmentBytes / 1024 / 1024)} MB or smaller.`);
  }

  task.attachments.push({
    key: body.key,
    filename: safeName(body.filename),
    contentType: head.contentType,
    size: head.size,
    uploadedBy: user.id,
    uploadedAt: new Date(),
  });
  await task.save();

  await logActivity({
    actor: user.id,
    entity: "Task",
    entityId: task.id,
    action: "updated",
    summary: `attached "${safeName(body.filename)}" to "${task.title}"`,
    link: `/tasks/${request.number}`,
  });

  const added = task.attachments[task.attachments.length - 1]!;
  return { id: String(added._id), filename: added.filename, size: added.size, contentType: added.contentType };
}

/** A short-lived storage URL. The caller redirects to it; the key is never exposed. */
export async function downloadUrl(user: UserDoc, taskId: string, attachmentId: string) {
  assertStorage();
  const { task } = await loadTask(taskId);
  // Reading follows task visibility: admins, or the person it is assigned to.
  if (!canEditTask(user, { assignee: task.assignee as unknown as string | null })) {
    throw forbidden("You can't open this file.");
  }
  const a = task.attachments.find((x) => String(x._id) === attachmentId);
  if (!a) throw notFound("File not found");
  const inline = a.contentType.startsWith("image/") || a.contentType === "application/pdf";
  return presignDownload(a.key, a.filename, inline);
}

export async function remove(user: UserDoc, taskId: string, attachmentId: string) {
  assertStorage();
  const { task, request } = await loadTask(taskId);
  const a = task.attachments.find((x) => String(x._id) === attachmentId);
  if (!a) throw notFound("File not found");
  // Admins remove anything; everyone else only what they uploaded themselves.
  if (!canManageTasks(user) && String(a.uploadedBy ?? "") !== user.id) {
    throw forbidden("You can only remove files you uploaded.");
  }

  const { key, filename } = a;
  task.attachments.pull({ _id: a._id });
  await task.save();
  await deleteObject(key);
  await logActivity({
    actor: user.id,
    entity: "Task",
    entityId: task.id,
    action: "updated",
    summary: `removed "${filename}" from "${task.title}"`,
    link: `/tasks/${request.number}`,
  });
}
