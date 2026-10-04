// Requests (#number) with their tasks and comments, My week, and projects.
import { Router } from "express";
import * as RequestService from "../Application/Tasks/RequestService";
import * as TaskService from "../Application/Tasks/TaskService";
import * as MyWeekService from "../Application/Tasks/MyWeekService";
import * as ProjectService from "../Application/Tasks/ProjectService";
import * as AttachmentService from "../Application/Tasks/AttachmentService";
import { getProjectTeam } from "../Application/Tasks/ProjectTeam";
import { me, requireAdmin } from "./Middleware/auth";

export const tasksController = Router();

type Query = Record<string, string | undefined>;

// ── Requests ──

tasksController.get("/tasks", async (req, res) => {
  res.json(await RequestService.listTree(me(req), req.query as Query));
});

tasksController.post("/tasks", async (req, res) => {
  res.status(201).json(await RequestService.createRequest(me(req), req.body));
});

tasksController.get("/tasks/:number", async (req, res) => {
  res.json(await RequestService.getRequest(me(req), String(req.params.number)));
});

tasksController.patch("/tasks/:number", async (req, res) => {
  await RequestService.updateRequest(me(req), String(req.params.number), req.body);
  res.json({ ok: true });
});

tasksController.post("/tasks/:number/status", async (req, res) => {
  await RequestService.setRequestStatus(me(req), String(req.params.number), req.body);
  res.json({ ok: true });
});

tasksController.delete("/tasks/:number", async (req, res) => {
  await RequestService.deleteRequest(me(req), String(req.params.number));
  res.json({ ok: true });
});

tasksController.post("/tasks/:number/comments", async (req, res) => {
  await RequestService.addComment(me(req), String(req.params.number), req.body);
  res.status(201).json({ ok: true });
});

// ── Tasks inside a request ──

tasksController.post("/tasks/:number/tasks", async (req, res) => {
  res.status(201).json(await TaskService.addTask(me(req), String(req.params.number), req.body));
});

tasksController.patch("/task-items/:id", async (req, res) => {
  await TaskService.updateTask(me(req), String(req.params.id), req.body);
  res.json({ ok: true });
});

// ── Attachments on a task ──
// The browser uploads straight to object storage, so the file never passes through here:
// ask for a presigned PUT, upload, then confirm.

tasksController.post("/task-items/:id/attachments/presign", async (req, res) => {
  res.json(await AttachmentService.presign(me(req), String(req.params.id), req.body));
});

tasksController.post("/task-items/:id/attachments", async (req, res) => {
  res.status(201).json(await AttachmentService.confirm(me(req), String(req.params.id), req.body));
});

// Redirects to a short-lived storage URL; the storage key is never sent to the client.
tasksController.get("/task-items/:id/attachments/:fileId", async (req, res) => {
  const url = await AttachmentService.downloadUrl(me(req), String(req.params.id), String(req.params.fileId));
  res.redirect(302, url);
});

tasksController.delete("/task-items/:id/attachments/:fileId", async (req, res) => {
  await AttachmentService.remove(me(req), String(req.params.id), String(req.params.fileId));
  res.json({ ok: true });
});

// Hand a task to someone on the project's team (admins and the request's owner).
tasksController.post("/task-items/:id/assign", async (req, res) => {
  res.json(await TaskService.assignTask(me(req), String(req.params.id), req.body));
});

tasksController.post("/task-items/:id/status", async (req, res) => {
  await TaskService.setTaskStatus(me(req), String(req.params.id), req.body);
  res.json({ ok: true });
});

tasksController.delete("/task-items/:id", async (req, res) => {
  await TaskService.deleteTask(me(req), String(req.params.id));
  res.json({ ok: true });
});

// ── My week ──

tasksController.get("/my-week", async (req, res) => {
  res.json(await MyWeekService.getMyWeek(me(req), req.query as Query));
});

// ── Projects (admins only) ──

// The project's manager (owner of its requests) and the people its tasks may go to.
tasksController.get("/projects/:id/team", async (req, res) => {
  res.json(await getProjectTeam(String(req.params.id)));
});

tasksController.get("/projects", requireAdmin, async (_req, res) => {
  res.json(await ProjectService.listProjects());
});

tasksController.post("/projects", requireAdmin, async (req, res) => {
  res.status(201).json(await ProjectService.createProject(me(req), req.body));
});

tasksController.patch("/projects/:id", requireAdmin, async (req, res) => {
  await ProjectService.updateProject(me(req), String(req.params.id), req.body);
  res.json({ ok: true });
});

tasksController.delete("/projects/:id", requireAdmin, async (req, res) => {
  await ProjectService.deleteProject(me(req), String(req.params.id));
  res.json({ ok: true });
});
