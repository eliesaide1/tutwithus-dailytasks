import type { NextFunction, Request, RequestHandler, Response } from "express";
import { User, type UserDoc } from "../../Model";
import { HttpError } from "../../Application/Common/errors";
import { SESSION_COOKIE, verifySession } from "../../Infrastructure/Security/session";
import { isAdmin, isManager } from "../../Application/Common/permissions";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDoc;
  }
}

/** Loads the signed-in user (if any) onto req.user. Never rejects. */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const session = await verifySession(req.cookies?.[SESSION_COOKIE]);
  if (session) {
    const user = await User.findById(session.userId).catch(() => null);
    if (user?.active) req.user = user;
  }
  next();
};

/**
 * Requires a signed-in user. People on a temporary password can only reach the
 * auth endpoints until they change it (the client sends them to /account).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Please sign in.", "UNAUTHENTICATED"));
  if (req.user.mustChangePassword) {
    return next(new HttpError(403, "Please change your temporary password first.", "PASSWORD_CHANGE_REQUIRED"));
  }
  next();
};

function gate(check: (u: UserDoc) => boolean, message: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) =>
    requireAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (!check(req.user!)) return next(new HttpError(403, message, "FORBIDDEN"));
      next();
    });
}

export const requireManager = gate(isManager, "Managers only.");
export const requireAdmin = gate(isAdmin, "Admins only.");

/** The signed-in user inside a handler guarded by requireAuth (or stronger). */
export function me(req: Request): UserDoc {
  if (!req.user) throw new HttpError(401, "Please sign in.", "UNAUTHENTICATED");
  return req.user;
}
