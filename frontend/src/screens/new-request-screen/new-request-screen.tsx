import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, X } from "lucide-react";
import { PRIORITIES, PRIORITY_LABELS, REQUEST_TYPES, REQUEST_TYPE_LABELS, TASK_KINDS } from "@/Shared/constants";
import { CreateRequest } from "@/Shared/SharedService";
import { TASK_KEYS, useProjectTeam } from "@/hooks/useTasks";
import { useMe } from "@/hooks/useAuth";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLookups } from "@/hooks/useLookups";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_Field } from "@/components/AP_Field";
import { AP_Input } from "@/components/AP_Input";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_OwnerField } from "@/components/AP_OwnerField";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_Select } from "@/components/AP_Select";
import { AP_Textarea } from "@/components/AP_Textarea";
import { personWithTitle } from "@/Shared/SharedFunctions";

export default function NewRequestScreen() {
  useDocumentTitle("New request");
  const user = useMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { projects, isLoading } = useLookups();
  const [projectId, setProjectId] = useState(params.get("project") ?? "");
  // The project's department manager owns the request; tasks can only go to their team.
  const team = useProjectTeam(projectId);
  const members = team.data?.members ?? [];
  const lead = team.data?.lead ?? null;
  const [rows, setRows] = useState<number[]>([0]);
  const [nextKey, setNextKey] = useState(1);

  const create = useApiMutation((body: Record<string, unknown>) => CreateRequest(body), {
    invalidate: [...TASK_KEYS],
    onSuccess: ({ number }) => navigate(`/tasks/${number}`),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    // Rows without a task title are ignored.
    const tasks = rows
      .map((key) => ({
        title: get(`t${key}_title`).trim(),
        kind: get(`t${key}_kind`) || "General",
        assignee: get(`t${key}_assignee`),
        estimateHours: get(`t${key}_estimate`),
        dueDate: get(`t${key}_due`),
        plannedWeek: get(`t${key}_week`),
      }))
      .filter((t) => t.title);
    create.mutate({
      project: get("project"),
      title: get("title"),
      description: get("description"),
      type: get("type"),
      priority: get("priority"),
      dueDate: get("dueDate"),
      tasks,
    });
  }

  const activeProjects = projects.filter((p) => !p.archived);

  return (
    <div className="max-w-4xl">
      <AP_PageHeader
        title="New request"
        description="A request groups the tasks needed to deliver one thing. Add the tasks now or later."
        actions={
          <AP_LinkButton to="/tasks" variant="secondary">
            Cancel
          </AP_LinkButton>
        }
      />
      <AP_Card className="p-5 sm:p-6">
        {!isLoading && (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <AP_Field label="Project">
                <AP_Select name="project" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="" disabled>
                    Choose a project…
                  </option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} – {p.name}
                    </option>
                  ))}
                </AP_Select>
              </AP_Field>
              <AP_OwnerField
                team={team.data}
                loading={team.isLoading}
                noProject={!projectId}
                fallback={`${user.name} (this project's team has no manager)`}
              />
            </div>
            <AP_Field label="Title">
              <AP_Input name="title" required maxLength={200} placeholder="e.g. Mandatory update notification – mobile app" />
            </AP_Field>
            <AP_Field label="Description">
              <AP_Textarea name="description" rows={4} placeholder="Context, links, acceptance criteria…" />
            </AP_Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <AP_Field label="Type">
                <AP_Select name="type" defaultValue="TASK">
                  {REQUEST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {REQUEST_TYPE_LABELS[t]}
                    </option>
                  ))}
                </AP_Select>
              </AP_Field>
              <AP_Field label="Priority">
                <AP_Select name="priority" defaultValue="MEDIUM">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </AP_Select>
              </AP_Field>
              <AP_Field label="Due date">
                <AP_Input name="dueDate" type="date" />
              </AP_Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
                <AP_Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRows((r) => [...r, nextKey]);
                    setNextKey((k) => k + 1);
                  }}
                >
                  <Plus className="size-3.5" /> Add task
                </AP_Button>
              </div>
              <div className="space-y-3">
                {rows.map((key) => (
                  <div key={key} className="relative grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-6">
                    <AP_Field label="Task" className="sm:col-span-6">
                      <AP_Input name={`t${key}_title`} placeholder="e.g. Solution development" maxLength={200} />
                    </AP_Field>
                    <AP_Field label="Kind" className="sm:col-span-2">
                      <AP_Select name={`t${key}_kind`} defaultValue="General">
                        {TASK_KINDS.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </AP_Select>
                    </AP_Field>
                    <AP_Field
                      label="Assignee"
                      className="sm:col-span-2"
                      hint={team.data?.department ? `${team.data.department.name} team only` : undefined}
                    >
                      <AP_Select
                        key={`${projectId}-${lead?.id ?? "none"}-${members.length}`}
                        name={`t${key}_assignee`}
                        defaultValue={lead?.id ?? ""}
                        disabled={!projectId || team.isLoading}
                      >
                        {!projectId && <option value="">Choose a project first</option>}
                        {projectId && !lead && <option value="">Unassigned</option>}
                        {members.map((p) => (
                          <option key={p.id} value={p.id}>
                            {personWithTitle(p)}
                          </option>
                        ))}
                      </AP_Select>
                    </AP_Field>
                    <AP_Field label="Estimate (h)" className="sm:col-span-2">
                      <AP_Input name={`t${key}_estimate`} type="number" min={0} step={0.25} />
                    </AP_Field>
                    <AP_Field label="Due" className="sm:col-span-3">
                      <AP_Input name={`t${key}_due`} type="date" />
                    </AP_Field>
                    <AP_Field label="Planned week (any day)" className="sm:col-span-3">
                      <AP_Input name={`t${key}_week`} type="date" />
                    </AP_Field>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRows((r) => r.filter((k) => k !== key))}
                        className="absolute top-2 right-2 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        aria-label="Remove task"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Rows without a task title are ignored.</p>
            </div>

            <div className="flex justify-end">
              <AP_Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create request"}
              </AP_Button>
            </div>
          </form>
        )}
      </AP_Card>
    </div>
  );
}
