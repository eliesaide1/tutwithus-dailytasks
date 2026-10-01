// Application errors. Services throw these; the controller layer turns them into HTTP
// responses (status + { error, code }).
/** Throw from any service to send `{ error }` with the given status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, what);
export const forbidden = (msg = "You don't have access to this.") => new HttpError(403, msg, "FORBIDDEN");
export const badRequest = (msg: string) => new HttpError(400, msg);
