import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as AuthService from "../Application/Auth/AuthService";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "../Infrastructure/Security/session";
import { me } from "./Middleware/auth";

export const authController = Router();

// 10 failed attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in a few minutes." },
});

authController.post("/auth/login", loginLimiter, async (req, res) => {
  const user = await AuthService.login(req.body);
  res.cookie(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions);
  res.json({ user: AuthService.sessionUser(user) });
});

authController.post("/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

// Works for users who still must change their password (the client needs to know).
authController.get("/auth/me", (req, res) => {
  res.json({ user: AuthService.sessionUser(me(req)) });
});

authController.post("/auth/change-password", async (req, res) => {
  res.json({ user: await AuthService.changePassword(me(req), req.body) });
});
