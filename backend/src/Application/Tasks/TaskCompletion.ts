// Closing a request has to close the work inside it.
//
// The Done report counts tasks (status DONE with a completedAt), not requests. A request
// marked delivered while its tasks still said "To do" left the report empty and the data
// contradicting itself, so the two are kept in step here.
import { Task, type UserDoc } from "../../Model";
import { logActivity } from "../Common/activity";

/**
 * Marks every unfinished task of a request as done, stamped `at` so it lands in the right
 * reporting period. Returns how many were changed; zero when they were already done.
 *
 * Logged rather than silent: these are completions nobody clicked, and the activity log
 * is where that becomes visible.
 */
export async function completeTasksOf(
  request: { _id: unknown; number: number; title: string },
  user: UserDoc,
  at: Date = new Date(),
) {
  const open = await Task.find({ request: request._id, status: { $ne: "DONE" } }).select("_id title");
  if (open.length === 0) return 0;

  await Task.updateMany({ _id: { $in: open.map((t) => t._id) } }, { $set: { status: "DONE", completedAt: at } });
  await logActivity({
    actor: user.id,
    entity: "Request",
    entityId: request.number,
    action: "status",
    summary: `marked ${open.length} task(s) done when closing #${request.number}`,
    link: `/tasks/${request.number}`,
  });
  return open.length;
}
