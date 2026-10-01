import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, MessageSquare, Pencil, Plus, Trash } from "lucide-react";
import { REQUEST_TYPE_LABELS, type RequestType } from "@/Shared/constants";
import { formatAge, formatShortDate } from "@/Shared/format";
import { AddComment, AddTask, DeleteRequest, UpdateRequest } from "@/Shared/SharedService";
import { formValues, hours } from "@/Shared/SharedFunctions";
import type { RequestActivity, RequestDetail } from "@/Shared/Types";
import { TASK_KEYS, useProjectTeam, useRequest } from "@/hooks/useTasks";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useBackTarget } from "@/hooks/useBack";
import { useLookups } from "@/hooks/useLookups";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Badge } from "@/components/AP_Badge";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_Field } from "@/components/AP_Field";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Textarea } from "@/components/AP_Textarea";
import { AP_PriorityBadge } from "@/components/AP_PriorityBadge";
import { AP_RequestStatusBadge } from "@/components/AP_RequestStatusBadge";
import { AP_RequestFields } from "@/components/AP_RequestFields";
import { AP_StatusSelect } from "@/components/AP_StatusSelect";
import { AP_TaskFields } from "@/components/AP_TaskFields";
import { AP_TaskRow } from "@/components/AP_TaskRow";
import { AP_Timing } from "@/components/AP_Timing";
import { AP_TypeIcon } from "@/components/AP_TypeIcon";
import { personWithTitle } from "@/Shared/SharedFunctions";

const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function RequestScreen() {
  const { number } = useParams();
  const q = useRequest(number);
  const r = q.data?.request;
  useDocumentTitle(r ? `#${r.number} ${r.title}` : "Request");
  // Return to the exact page (and week) the request was opened from, e.g. My week.
  const back = useBackTarget();

  return (
    <div className="space-y-6">
      <Link to={back?.from ?? "/tasks"} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> {back ? `Back to ${back.fromLabel}` : "All tasks"}
      </Link>
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        {r && <RequestView r={r} activity={q.data!.activity} />}
      </AP_QueryState>
    </div>
  );
}

function RequestView({ r, activity }: { r: RequestDetail; activity: RequestActivity[] }) {
  const navigate = useNavigate();
  const { projects } = useLookups();
  // Tasks of this request can only go to its project's team (department manager + their people).
  const team = useProjectTeam(r.project.id);
  const people = (team.data?.members ?? []).map((p) => ({ id: p.id, name: personWithTitle(p) }));
  const [editingRequest, setEditingRequest] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  const closed = r.status === "DONE" || r.status === "CANCELLED";
  const done = r.tasks.filter((t) => t.status === "DONE").length;
  const estimate = r.tasks.reduce((n, t) => n + (t.estimateMins ?? 0), 0);

  const del = useApiMutation(() => DeleteRequest(r.number), {
    invalidate: [...TASK_KEYS],
    onSuccess: () => navigate("/tasks", { replace: true }),
  });
  const update = useApiMutation((body: Record<string, unknown>) => UpdateRequest(r.number, body), {
    invalidate: [...TASK_KEYS],
    onSuccess: () => setEditingRequest(false),
  });
  const addTask = useApiMutation((body: Record<string, unknown>) => AddTask(r.number, body), {
    invalidate: [...TASK_KEYS],
  });
  const comment = useApiMutation((body: string) => AddComment(r.number, body), {
    invalidate: [["tasks", "detail", String(r.number)], ["dashboard"]],
  });

  const submit = (fn: (body: Record<string, unknown>) => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fn(formValues(e.currentTarget));
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-white" style={{ background: r.project.color }}>
              {r.project.code}
            </span>
            <span className="text-sm text-slate-500">{r.project.name}</span>
            <AP_Badge tone="slate">
              <AP_TypeIcon type={r.type} className="size-3.5" />
              {REQUEST_TYPE_LABELS[r.type as RequestType] ?? r.type}
            </AP_Badge>
            <AP_PriorityBadge priority={r.priority} />
            <AP_RequestStatusBadge status={r.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-800">
            <span className="text-slate-400">#{r.number}</span> {r.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
            Created by {r.createdBy?.name ?? "someone"} {formatAge(r.createdAt)}
            {r.dueDate && <>· due {formatShortDate(r.dueDate)}</>}
            <AP_Timing createdAt={r.createdAt} dueDate={r.dueDate} closed={closed} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AP_StatusSelect kind="request" id={r.number} status={r.status} disabled={!r.canEdit} />
          {r.canEdit && (
            <button
              type="button"
              onClick={() => confirm(`Delete request #${r.number} and all its tasks?`) && del.mutate(undefined)}
              disabled={del.isPending}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete request"
            >
              <Trash className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {r.description && (
            <AP_Card className="px-5 py-4">
              <p className="text-sm whitespace-pre-wrap text-slate-700">{r.description}</p>
            </AP_Card>
          )}

          <AP_Card>
            <AP_CardHeader title={`Tasks (${done}/${r.tasks.length} done)`} description={estimate ? `${hours(estimate)} h estimated` : undefined} />
            {r.partial && (
              <p className="border-b border-slate-100 bg-brand-50/60 px-5 py-2 text-xs text-brand-700">
                You're seeing only the tasks assigned to you in this request.
              </p>
            )}
            {r.tasks.length === 0 ? (
              <AP_EmptyState title="No tasks yet" description="Break this request into tasks and assign them." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {r.tasks.map((t) => (
                  <AP_TaskRow key={t.id} t={t} people={people} team={team.data?.members ?? []} canAssign={!!r.canAssign} />
                ))}
              </ul>
            )}
            {r.canEdit && (
              <div className="border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setAddingTask((v) => !v)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
                >
                  <Plus className="size-4" /> Add task
                </button>
                {addingTask && (
                  <form
                    className="mt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      addTask.mutate(formValues(form), { onSuccess: () => form.reset() });
                    }}
                  >
                    <AP_TaskFields people={people} />
                    <div className="mt-3 flex justify-end">
                      <AP_Button type="submit" size="sm" disabled={addTask.isPending}>
                        {addTask.isPending ? "Adding…" : "Add task"}
                      </AP_Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </AP_Card>

          <AP_Card>
            <AP_CardHeader title={`Comments (${r.comments.length})`} />
            <ul className="divide-y divide-slate-100">
              {r.comments.map((c) => (
                <li key={c.id} className="flex gap-3 px-5 py-3">
                  <AP_Avatar name={c.author?.name ?? "?"} src={c.author?.avatarUrl} size={30} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{c.author?.name ?? "Former member"}</span> · {formatAge(c.createdAt)}
                    </p>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap text-slate-700">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <form
              className="border-t border-slate-100 px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                comment.mutate(String(new FormData(form).get("body") ?? ""), { onSuccess: () => form.reset() });
              }}
            >
              <AP_Field label="Add a comment">
                <AP_Textarea name="body" rows={2} className="min-h-0" placeholder="Updates, questions, links…" required maxLength={5000} />
              </AP_Field>
              <div className="mt-2 flex justify-end">
                <AP_Button type="submit" size="sm" disabled={comment.isPending}>
                  <MessageSquare className="size-3.5" /> {comment.isPending ? "Posting…" : "Comment"}
                </AP_Button>
              </div>
            </form>
          </AP_Card>
        </div>

        <div className="space-y-6">
          <AP_Card className="px-5 py-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="label">Owner</dt>
                <dd className="flex items-center gap-2">
                  {r.owner ? (
                    <>
                      <AP_Avatar name={r.owner.name} src={r.owner.avatarUrl} size={24} />
                      <Link to={`/people/${r.owner.id}`} className="font-medium hover:text-brand-700">
                        {r.owner.name}
                      </Link>
                      <span className="text-xs text-slate-500">{r.owner.title}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">No owner</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label">Created</dt>
                <dd>{fmtDateTime(r.createdAt)}</dd>
              </div>
              {r.closedAt && (
                <div>
                  <dt className="label">Closed</dt>
                  <dd>{fmtDateTime(r.closedAt)}</dd>
                </div>
              )}
            </dl>
            {r.canEdit && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRequest((v) => !v)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
                >
                  <Pencil className="size-3.5" /> Edit request
                </button>
                {editingRequest && (
                  <form className="mt-3" onSubmit={submit((b) => update.mutate(b))}>
                    <AP_RequestFields projects={projects} request={r} />
                    <div className="mt-3 flex justify-end">
                      <AP_Button type="submit" size="sm" disabled={update.isPending}>
                        {update.isPending ? "Saving…" : "Save"}
                      </AP_Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </AP_Card>

          <AP_Card>
            <AP_CardHeader title="Activity" />
            {activity.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ul className="space-y-2.5 px-5 py-4">
                {activity.map((a) => (
                  <li key={a.id} className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{a.actor?.name ?? "Someone"}</span> {a.summary}
                    <span className="block text-slate-400">{formatAge(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AP_Card>
        </div>
      </div>
    </>
  );
}
