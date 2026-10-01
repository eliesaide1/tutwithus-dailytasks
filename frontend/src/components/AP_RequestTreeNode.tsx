import { Link } from "react-router";
import { CircleCheck, FolderOpen } from "lucide-react";
import { cn, formatShortDate } from "@/Shared/format";
import type { TreeRequest } from "@/Shared/Types";
import { useBackHere } from "@/hooks/useBack";
import { AP_Avatar } from "./AP_Avatar";
import { AP_RequestStatusBadge } from "./AP_RequestStatusBadge";
import { AP_TaskStatusBadge } from "./AP_TaskStatusBadge";
import { AP_Timing } from "./AP_Timing";
import { AP_TypeIcon } from "./AP_TypeIcon";

/** One request in the task tree: number, task count, title, timing, and its tasks when expanded. */
export function AP_RequestTreeNode({
  r,
  now,
  showProject,
  doneHidden = 0,
}: {
  r: TreeRequest;
  now: Date;
  showProject: boolean;
  /** Done tasks left out of the list (the tree only shows what is still to do). */
  doneHidden?: number;
}) {
  const backHere = useBackHere("Tasks");
  const closed = r.status === "DONE" || r.status === "CANCELLED";
  return (
    <li className="py-0.5">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-1 py-1 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <FolderOpen className={cn("size-4", r.status === "CANCELLED" ? "text-slate-400" : "text-emerald-600")} />
          <AP_TypeIcon type={r.type} />
          <Link
            to={`/tasks/${r.number}`}
            state={backHere}
            className={cn(
              "font-semibold hover:text-brand-700 hover:underline",
              r.status === "DONE" ? "text-emerald-700" : r.status === "CANCELLED" ? "text-slate-500 line-through" : "text-slate-900",
            )}
          >
            {r.number} [{r.tasks.length}] task(s) – {r.title}
          </Link>
          <AP_Timing createdAt={r.createdAt} dueDate={r.dueDate} closed={closed} now={now} />
          {showProject && (
            <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: r.project.color }}>
              {r.project.code}
            </span>
          )}
          {r.status !== "OPEN" && <AP_RequestStatusBadge status={r.status} />}
        </summary>
        {r.tasks.length === 0 ? (
          doneHidden > 0 ? (
            <p className="ml-6 inline-flex items-center gap-1 py-1 text-xs font-medium text-emerald-700">
              <CircleCheck className="size-3.5" /> All {doneHidden} task(s) done – this request can be closed.
            </p>
          ) : (
            <p className="ml-6 py-1 text-xs text-slate-400">No tasks yet.</p>
          )
        ) : (
          <ul className="ml-3 border-l border-dotted border-slate-300 pl-5">
            {r.tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-1 text-slate-700">
                <span className={cn("inline-flex items-center gap-1", t.status === "DONE" && "font-medium text-emerald-700")}>
                  {t.status === "DONE" && <CircleCheck className="size-3.5 text-emerald-600" aria-label="Done" />}
                  {t.title}
                </span>
                <AP_TaskStatusBadge status={t.status} />
                {t.assignee && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <AP_Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size={18} />
                    {t.assignee.name}
                  </span>
                )}
                {t.dueDate && <span className="text-xs text-slate-500">due {formatShortDate(t.dueDate)}</span>}
              </li>
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}
