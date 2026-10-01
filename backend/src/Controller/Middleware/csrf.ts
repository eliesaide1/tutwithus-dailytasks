import type { RequestHandler } from "express";
import { HttpError } from "../../Application/Common/errors";

// CSRF guard: state-changing API calls must carry a header that cross-site forms
// cannot set. The frontend's api() helper always sends it.
export const requireAppHeader: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.get("x-requested-with") === "twu") return next();
  next(new HttpError(403, "Missing X-Requested-With header.", "CSRF"));
};
