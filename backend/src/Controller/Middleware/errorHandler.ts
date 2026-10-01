// Maps application, validation and database errors to JSON HTTP responses.
import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { HttpError } from "../../Application/Common/errors";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input", code: "VALIDATION" });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "value";
    res.status(409).json({ error: `That ${field} is already in use.`, code: "DUPLICATE" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
};

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};
