// Reports for the admins (Charbel, Elie, Gabriel).
import { Router } from "express";
import * as ReportService from "../Application/Reports/ReportService";
import { me, requireAdmin } from "./Middleware/auth";

export const reportsController = Router();

reportsController.get("/reports/completed", requireAdmin, async (req, res) => {
  res.json(await ReportService.getCompletedReport(me(req), { from: req.query.from, to: req.query.to }));
});
