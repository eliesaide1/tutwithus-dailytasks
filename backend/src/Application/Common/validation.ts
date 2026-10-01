// Input validation with zod. Services validate raw request input with parse().
import mongoose from "mongoose";
import { z, type ZodType } from "zod";
import { HttpError } from "./errors";

/** Parse and validate with zod; throws a 400 with the first issue's message. */
export function parse<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new HttpError(400, `${where}${issue?.message ?? "Invalid input"}`, "VALIDATION");
  }
  return r.data;
}

// ── Reusable zod pieces ──

export const zId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
/** Optional reference: "" / null -> null. */
export const zRef = z
  .union([zId, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
/** Optional text: trims; "" -> null. */
export const zText = (max = 5000) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null))
    .pipe(z.string().max(max).nullable());
/** "YYYY-MM-DD" or ISO string -> Date (UTC midnight for plain dates), "" / null -> null. */
export const zDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00.000Z` : v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });
