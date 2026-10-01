// Dashboard, notifications, announcements, workload, activity log and lookups.
import { Router } from "express";
import * as DashboardService from "../Application/Core/DashboardService";
import * as NotificationService from "../Application/Core/NotificationService";
import * as AnnouncementService from "../Application/Core/AnnouncementService";
import * as WorkloadService from "../Application/Core/WorkloadService";
import * as ActivityService from "../Application/Core/ActivityService";
import * as LookupService from "../Application/Core/LookupService";
import { me, requireAdmin, requireManager } from "./Middleware/auth";

export const coreController = Router();

coreController.get("/lookups", async (_req, res) => {
  res.json(await LookupService.getLookups());
});

coreController.get("/dashboard", async (req, res) => {
  res.json(await DashboardService.getDashboard(me(req)));
});

// ── Notifications ──

coreController.get("/notifications/unread-count", async (req, res) => {
  res.json({ count: await NotificationService.unreadCount(me(req)) });
});

coreController.get("/notifications", async (req, res) => {
  res.json({ items: await NotificationService.listNotifications(me(req)) });
});

coreController.post("/notifications/:id/read", async (req, res) => {
  res.json({ item: await NotificationService.markRead(me(req), req.params.id) });
});

coreController.post("/notifications/read-all", async (req, res) => {
  await NotificationService.markAllRead(me(req));
  res.json({ ok: true });
});

// ── Announcements ──

coreController.get("/announcements", async (_req, res) => {
  res.json({ items: await AnnouncementService.listAnnouncements() });
});

coreController.post("/announcements", requireManager, async (req, res) => {
  res.status(201).json({ item: await AnnouncementService.createAnnouncement(me(req), req.body) });
});

coreController.post("/announcements/:id/pin", requireManager, async (req, res) => {
  res.json({ item: await AnnouncementService.togglePin(String(req.params.id)) });
});

coreController.delete("/announcements/:id", requireManager, async (req, res) => {
  await AnnouncementService.deleteAnnouncement(me(req), String(req.params.id));
  res.json({ ok: true });
});

// ── Workload & activity ──

coreController.get("/workload", async (req, res) => {
  const week = typeof req.query.week === "string" ? req.query.week : null;
  res.json(await WorkloadService.getWorkload(me(req), week));
});

coreController.get("/activity", requireAdmin, async (req, res) => {
  res.json(await ActivityService.listActivity({ entity: req.query.entity, user: req.query.user }));
});
