// What has been finished. Open to everyone; the service limits a member to their own.
import { Router } from "express";
import * as ReportService from "../Application/Reports/ReportService";
import { me } from "./Middleware/auth";

export const reportsController = Router();

reportsController.get("/reports/completed", async (req, res) => {
  res.json(await ReportService.getCompletedReport(me(req), { from: req.query.from, to: req.query.to }));
});
