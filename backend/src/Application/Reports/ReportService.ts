// Done report: every task completed in a period, with totals per person and per project.
import { z } from "zod";
import { Task, type UserDoc } from "../../Model";
import { parse } from "../Common/validation";
import { badRequest } from "../Common/errors";
import { addDays, zonedToUtc } from "../Shared/time";

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.");
const rangeSchema = z.object({ from: dateText, to: dateText });

type Lean = Record<string, unknown> & { _id: unknown };
type Ref = { _id: unknown; name?: string; avatarUrl?: string | null; title?: string } | null;

/** Midnight at the start of "YYYY-MM-DD" in `zone`, as a UTC instant. */
function startOfDay(day: string, zone: string) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return zonedToUtc(y, m, d, 0, zone);
}

/**
 * Tasks completed from `from` to `to` (both inclusive, calendar days in the viewer's time
 * zone). "On time" = completed before the end of its due date.
 */
export async function getCompletedReport(viewer: UserDoc, input: unknown) {
  const { from, to } = parse(rangeSchema, input);
  if (from > to) throw badRequest("The start date must be before the end date.");
  const zone = viewer.timezone;
  const start = startOfDay(from, zone);
  const end = startOfDay(addDays(new Date(`${to}T00:00:00Z`), 1).toISOString().slice(0, 10), zone);
  if (end.getTime() - start.getTime() > 400 * 86_400_000) throw badRequest("Pick a period of at most about a year.");

  const tasks = (await Task.find({ status: "DONE", completedAt: { $gte: start, $lt: end } })
    .sort({ completedAt: -1 })
    .populate("assignee", "name avatarUrl title")
    .populate({ path: "request", select: "number title project", populate: { path: "project", select: "code name color" } })
    .lean()) as unknown as Lean[];

  const rows = tasks.map((t) => {
    const request = t.request as { number: number; title: string; project: { _id: unknown; code: string; name: string; color: string } } | null;
    const assignee = t.assignee as Ref;
    const completedAt = t.completedAt as Date;
    const dueDate = (t.dueDate as Date | undefined) ?? null;
    // Due dates are calendar days: anything finished during that day counts as on time.
    const dueEnd = dueDate ? startOfDay(addDays(dueDate, 1).toISOString().slice(0, 10), zone) : null;
    return {
      id: String(t._id),
      title: t.title as string,
      kind: (t.kind as string) ?? "General",
      estimateMins: (t.estimateMins as number | undefined) ?? null,
      completedAt,
      dueDate,
      onTime: dueEnd ? completedAt < dueEnd : null,
      assignee: assignee ? { id: String(assignee._id), name: assignee.name ?? "", avatarUrl: assignee.avatarUrl ?? null, title: assignee.title ?? "" } : null,
      request: request
        ? {
            number: request.number,
            title: request.title,
            project: { id: String(request.project?._id), code: request.project?.code ?? "", name: request.project?.name ?? "", color: request.project?.color ?? "#64748b" },
          }
        : null,
    };
  });

  const byPerson = new Map<string, { person: (typeof rows)[number]["assignee"]; count: number; estimateMins: number; onTime: number; late: number }>();
  const byProject = new Map<string, { project: NonNullable<(typeof rows)[number]["request"]>["project"]; count: number; estimateMins: number }>();
  for (const r of rows) {
    const pk = r.assignee?.id ?? "unassigned";
    const p = byPerson.get(pk) ?? { person: r.assignee, count: 0, estimateMins: 0, onTime: 0, late: 0 };
    p.count += 1;
    p.estimateMins += r.estimateMins ?? 0;
    if (r.onTime === true) p.onTime += 1;
    if (r.onTime === false) p.late += 1;
    byPerson.set(pk, p);
    if (r.request) {
      const j = byProject.get(r.request.project.id) ?? { project: r.request.project, count: 0, estimateMins: 0 };
      j.count += 1;
      j.estimateMins += r.estimateMins ?? 0;
      byProject.set(r.request.project.id, j);
    }
  }

  return {
    from,
    to,
    timezone: zone,
    total: rows.length,
    estimateMins: rows.reduce((n, r) => n + (r.estimateMins ?? 0), 0),
    onTime: rows.filter((r) => r.onTime === true).length,
    late: rows.filter((r) => r.onTime === false).length,
    byPerson: [...byPerson.values()].sort((a, b) => b.count - a.count),
    byProject: [...byProject.values()].sort((a, b) => b.count - a.count),
    tasks: rows,
  };
}
