import { useState } from "react";
import { Check, CircleCheck, Clock, Pencil, Trash, X } from "lucide-react";
import { cn, formatShortDate } from "@/Shared/format";
import { ApproveTask, DeleteTask, RejectTask, UpdateTask } from "@/Shared/SharedService";
import { formValues, hours } from "@/Shared/SharedFunctions";
import type { TaskItem, TeamPerson } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_KEYS } from "@/hooks/useTasks";
import { AP_AssigneeSelect } from "./AP_AssigneeSelect";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Button } from "./AP_Button";
import { AP_StatusSelect } from "./AP_StatusSelect";
import { AP_TaskFields } from "./AP_TaskFields";
import { AP_TaskStatusBadge } from "./AP_TaskStatusBadge";
import { AP_Attachments } from "./AP_Attachments";

/**
 * One task inside a request: details, status, (for admins) edit / delete, and for the
 * request's owner (the department manager) a quick "assign to" picker limited to their team.
 */
export function AP_TaskRow({
  t,
  people,
  team = [],
  canAssign = false,
}: {
  t: TaskItem;
  people: { id: string; name: string }[];
  team?: TeamPerson[];
  canAssign?: boolean;
}) {
  // Admins reassign through the edit form; the manager gets the quick picker.
  const quickAssign = canAssign && !t.canManage && team.length > 0;
  // A task held by someone outside the project's team still has to show who holds it,
  // or the picker renders blank and reads as unassigned.
  const assignable = t.assignee && !team.some((p) => p.id === t.assignee!.id)
    ? [{ ...t.assignee, title: t.assignee.title ?? "" }, ...team]
    : team;
  const [editing, setEditing] = useState(false);
  const update = useApiMutation((body: Record<string, unknown>) => UpdateTask(t.id, body), {
    invalidate: [...TASK_KEYS],
    onSuccess: () => setEditing(false),
  });
  const del = useApiMutation(() => DeleteTask(t.id), { invalidate: [...TASK_KEYS] });
  const approve = useApiMutation(() => ApproveTask(t.id), { invalidate: [...TASK_KEYS] });
  const rejectTask = useApiMutation((note: string) => RejectTask(t.id, note), { invalidate: [...TASK_KEYS] });
  const queryClient = useQueryClient();
  const refresh = () => TASK_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

  return (
    <li className={cn("px-5 py-3", t.status === "DONE" && "border-l-4 border-l-emerald-500 bg-emerald-50/60")}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("flex items-center gap-1.5 text-sm font-medium", t.status === "DONE" ? "text-emerald-800" : "text-slate-900")}>
            {t.status === "DONE" && <CircleCheck className="size-4 shrink-0 text-emerald-600" aria-label="Done" />}
            {t.title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {/* Which department's copy this is, when the task was raised across several. */}
            {t.department && (
              <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: t.department.color }}>
                {t.department.name}
              </span>
            )}
            <span>{t.kind}</span>
            {quickAssign ? (
              <AP_AssigneeSelect taskId={t.id} current={t.assignee?.id ?? null} team={assignable} />
            ) : t.assignee ? (
              <span className="inline-flex items-center gap-1">
                <AP_Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size={16} />
                {t.assignee.name}
              </span>
            ) : (
              <span className="italic">Unassigned</span>
            )}
            {t.estimateMins != null && <span>{hours(t.estimateMins)} h</span>}
            {t.dueDate && <span>due {formatShortDate(t.dueDate)}</span>}
            {t.plannedWeek && <span>week of {formatShortDate(t.plannedWeek)}</span>}
          </p>
          {t.approval.status === "PENDING" && (
            <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50/70 px-2 py-1">
              <Clock className="size-3.5 shrink-0 text-amber-600" />
              <span className="text-xs text-amber-900">
                {t.approval.canDecide ? "Raised for this person — not posted until you approve it." : "Waiting for Gabriel to approve. The assignee hasn't been told yet."}
              </span>
              {t.approval.canDecide && (
                <span className="ml-auto flex gap-1.5">
                  <AP_Button type="button" size="sm" disabled={approve.isPending || rejectTask.isPending} onClick={() => approve.mutate(undefined)}>
                    <Check className="size-3" /> Approve
                  </AP_Button>
                  <AP_Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={approve.isPending || rejectTask.isPending}
                    onClick={() => rejectTask.mutate(prompt("Why is this task not approved? (optional)") ?? "")}
                  >
                    <X className="size-3" /> Reject
                  </AP_Button>
                </span>
              )}
            </div>
          )}
          {t.approval.status === "REJECTED" && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-red-600">
              <X className="size-3.5" /> Not approved{t.approval.note ? ` — ${t.approval.note}` : ""}
            </p>
          )}
          {t.blocker && t.status !== "DONE" && <p className="mt-1 text-xs text-red-700">Blocker: {t.blocker}</p>}
          {t.description && <p className="mt-1 text-xs whitespace-pre-wrap text-slate-600">{t.description}</p>}
          {/* Attaching follows canEdit: admins, or whoever the task belongs to. */}
          {(t.attachments.length > 0 || t.canEdit) && (
            <div className="mt-2 max-w-xl">
              <AP_Attachments taskId={t.id} attachments={t.attachments} canEdit={t.canEdit} onChange={refresh} />
            </div>
          )}
        </div>
        {t.canEdit ? <AP_StatusSelect kind="task" id={t.id} status={t.status} /> : <AP_TaskStatusBadge status={t.status} />}
      </div>
      {t.canManage && (
        <div className="mt-2">
          <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
            <Pencil className="size-3" /> Edit
          </button>
          {editing && (
            <>
              <form
                className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  update.mutate(formValues(e.currentTarget));
                }}
              >
                <AP_TaskFields people={people} task={t} />
                <div className="mt-3 flex justify-end">
                  <AP_Button type="submit" size="sm" disabled={update.isPending}>
                    {update.isPending ? "Saving…" : "Save task"}
                  </AP_Button>
                </div>
              </form>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => confirm(`Delete task "${t.title}"?`) && del.mutate(undefined)}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                >
                  <Trash className="size-3" /> Delete task
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
