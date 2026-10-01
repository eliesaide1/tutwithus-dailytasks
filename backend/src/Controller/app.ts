import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "../Infrastructure/Config/config";
import { apiNotFound, errorHandler } from "./Middleware/errorHandler";
import { loadUser, requireAuth } from "./Middleware/auth";
import { requireAppHeader } from "./Middleware/csrf";
import { authController } from "./AuthController";
import { coreController } from "./CoreController";
import { tasksController } from "./TasksController";
import { peopleController } from "./PeopleController";
import { scheduleController } from "./ScheduleController";
import { reportsController } from "./ReportsController";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: config.isProd ? undefined : false, crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Everything under /api needs the session. CORS only for the configured frontend origins.
  app.use("/api", cors({ origin: config.appOrigins, credentials: true }));
  app.use("/api", loadUser, requireAppHeader);
  app.use("/api", authController); // /auth/* handles its own auth rules
  app.use("/api", requireAuth);
  app.use("/api", coreController, tasksController, peopleController, scheduleController, reportsController);
  app.use("/api", apiNotFound);

  // Production: serve the built React app from the same origin.
  if (config.isProd && existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(config.clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
