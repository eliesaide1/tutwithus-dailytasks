import { Link } from "react-router";
import { CalendarClock, Clock } from "lucide-react";
import type { WeekTask } from "@/Shared/Types";
import type { BackState } from "@/hooks/useBack";
import { hours } from "@/Shared/SharedFunctions";
import { cn, formatShortDate } from "@/Shared/format";
import { AP_DoneCheckbox } from "./AP_DoneCheckbox";
import { AP_TaskStatusBadge } from "./AP_TaskStatusBadge";

/** One task on My week: tick to mark done, click the title to open its request. */
export function AP_WeekTaskCard({
  task,
  late,
  showDue,
  backState,
}: {
  task: WeekTask;
  /** Past its due date and not done. */
  late?: boolean;
  /** Show the due date (for tasks listed outside their own day). */
  showDue?: boolean;
  backState: BackState;
}) {
  const done = task.status === "DONE";
  return (
    <li
      className={cn(
        "group flex gap-3 rounded-lg border bg-white p-3 shadow-xs transition hover:border-brand-200 hover:shadow-sm",
        done ? "border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50" : late ? "border-red-200 border-l-4 border-l-red-500" : "border-slate-200",
      )}
    >
      <AP_DoneCheckbox id={task.id} done={done} disabled={!task.canEdit} label={task.title} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/tasks/${task.request.number}`}
          state={backState}
          title={task.title}
          className={cn(
            "line-clamp-2 text-sm leading-snug group-hover:text-brand-700",
            done ? "font-medium text-emerald-800" : "font-medium text-slate-900",
          )}
        >
          {task.title}
        </Link>
        <p className="mt-1 truncate text-xs text-slate-500" title={task.request.title}>
          #{task.request.number} · {task.request.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span
            className="rounded px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white"
            style={{ background: task.request.project.color }}
          >
            {task.request.project.code}
          </span>
          {task.estimateMins != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {hours(task.estimateMins)} h
            </span>
          )}
          {showDue && task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", late && "font-medium text-red-600")}>
              <CalendarClock className="size-3.5" /> due {formatShortDate(task.dueDate)}
            </span>
          )}
          {task.status !== "TODO" && <AP_TaskStatusBadge status={task.status} />}
        </div>
      </div>
    </li>
  );
}
