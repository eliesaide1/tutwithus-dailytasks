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

/**
 * True when the session was issued before this account's access was last reset, so it no
 * longer counts. A session carries only the account's id, which is what lets it survive a
 * change to the account — the right behaviour for a rename the person made themselves,
 * the wrong one when their sign-in address moved underneath them.
 *
 * Compared in whole seconds, because that is all `iat` records. Comparing it against a
 * millisecond cut-off makes a token issued *during* the cut-off second look older than
 * it — which rejects the sign-in someone makes in the same second the stamp was written,
 * locking everyone out for a second rather than letting them straight back in. Only a
 * session from a strictly earlier second is stale.
 */
const isStaleSession = (user: UserDoc, issuedAt: number) => {
  const cutoff = user.sessionsValidFrom?.getTime();
  return !!cutoff && issuedAt < Math.floor(cutoff / 1000);
};

/** Loads the signed-in user (if any) onto req.user. Never rejects. */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const session = await verifySession(req.cookies?.[SESSION_COOKIE]);
  if (session) {
    const user = await User.findById(session.userId).catch(() => null);
    if (user?.active && !isStaleSession(user, session.issuedAt)) req.user = user;
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
