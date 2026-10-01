// Schedule: week view, team availability, meetings (RSVP), .ics export.
import { Router } from "express";
import * as ScheduleService from "../Application/Schedule/ScheduleService";
import * as MeetingService from "../Application/Schedule/MeetingService";
import * as AvailabilityService from "../Application/Schedule/AvailabilityService";
import * as CalendarExportService from "../Application/Schedule/CalendarExportService";
import { me, requireManager } from "./Middleware/auth";

export const scheduleController = Router();

const queryString = (v: unknown) => (typeof v === "string" ? v : undefined);

/** GET /api/schedule?week=YYYY-MM-DD&tz=Area/City */
scheduleController.get("/schedule", async (req, res) => {
  res.json(await ScheduleService.getWeek(me(req), { week: queryString(req.query.week), tz: queryString(req.query.tz) }));
});

// ── Meetings ──

scheduleController.get("/meetings/:id", requireManager, async (req, res) => {
  res.json(await MeetingService.getMeeting(me(req), String(req.params.id)));
});

scheduleController.get("/meetings-form-options", requireManager, async (_req, res) => {
  res.json(await MeetingService.formOptions());
});

scheduleController.post("/meetings", requireManager, async (req, res) => {
  res.status(201).json(await MeetingService.createMeeting(me(req), req.body));
});

scheduleController.put("/meetings/:id", requireManager, async (req, res) => {
  res.json(await MeetingService.updateMeeting(me(req), String(req.params.id), req.body));
});

scheduleController.delete("/meetings/:id", requireManager, async (req, res) => {
  await MeetingService.deleteMeeting(me(req), String(req.params.id));
  res.json({ ok: true });
});

scheduleController.post("/meetings/:id/rsvp", async (req, res) => {
  res.json(await MeetingService.rsvp(me(req), String(req.params.id), req.body));
});

// ── Availability ──

scheduleController.get("/availability/:userId", async (req, res) => {
  res.json(await AvailabilityService.getAvailability(me(req), String(req.params.userId)));
});

scheduleController.put("/availability/:userId", async (req, res) => {
  res.json(await AvailabilityService.replaceAvailability(me(req), String(req.params.userId), req.body));
});

// ── Calendar export ──

scheduleController.get("/schedule/ics", async (req, res) => {
  const { filename, body } = await CalendarExportService.exportMeetings(me(req));
  res
    .set({
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    })
    .send(body);
});
