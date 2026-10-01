// Directory, profiles, org chart, teams and admin user management.
import { Router } from "express";
import * as PeopleService from "../Application/People/PeopleService";
import * as TeamService from "../Application/People/TeamService";
import * as UserAdminService from "../Application/People/UserAdminService";
import { me, requireAdmin, requireManager } from "./Middleware/auth";

export const peopleController = Router();

// ── People & org chart ──

peopleController.get("/people", async (_req, res) => {
  res.json(await PeopleService.listPeople());
});

peopleController.get("/org-chart", async (_req, res) => {
  res.json(await PeopleService.getOrgChart());
});

peopleController.get("/people/:id", async (req, res) => {
  res.json(await PeopleService.getProfile(me(req), String(req.params.id)));
});

peopleController.patch("/people/:id", async (req, res) => {
  res.json({ person: await PeopleService.updateProfile(me(req), String(req.params.id), req.body) });
});

// ── Teams ──

peopleController.get("/teams", async (req, res) => {
  res.json(await TeamService.listTeams(me(req)));
});

peopleController.get("/teams/:id", async (req, res) => {
  res.json(await TeamService.getTeam(me(req), String(req.params.id)));
});

peopleController.post("/teams", requireManager, async (req, res) => {
  res.status(201).json({ team: await TeamService.saveTeam(me(req), null, req.body) });
});

peopleController.patch("/teams/:id", requireManager, async (req, res) => {
  res.json({ team: await TeamService.saveTeam(me(req), String(req.params.id), req.body) });
});

peopleController.delete("/teams/:id", requireManager, async (req, res) => {
  await TeamService.deleteTeam(me(req), String(req.params.id));
  res.json({ ok: true });
});

peopleController.post("/teams/:id/members", requireManager, async (req, res) => {
  await TeamService.addMember(me(req), String(req.params.id), req.body);
  res.json({ ok: true });
});

peopleController.delete("/teams/:id/members/:userId", requireManager, async (req, res) => {
  await TeamService.removeMember(me(req), String(req.params.id), String(req.params.userId));
  res.json({ ok: true });
});

// ── Admin: user accounts (admins only) ──

peopleController.use("/admin/users", requireAdmin);

peopleController.get("/admin/users", async (_req, res) => {
  res.json({ users: await UserAdminService.listUsers() });
});

peopleController.get("/admin/users/:id", async (req, res) => {
  res.json({ user: await UserAdminService.getUser(String(req.params.id)) });
});

peopleController.post("/admin/users", async (req, res) => {
  res.status(201).json(await UserAdminService.createUser(me(req), req.body));
});

peopleController.patch("/admin/users/:id", async (req, res) => {
  res.json({ user: await UserAdminService.updateUser(me(req), String(req.params.id), req.body) });
});

peopleController.post("/admin/users/:id/reset-password", async (req, res) => {
  res.json(await UserAdminService.resetPassword(me(req), String(req.params.id)));
});

peopleController.post("/admin/users/:id/active", async (req, res) => {
  res.json(await UserAdminService.setActive(me(req), String(req.params.id), req.body));
});
