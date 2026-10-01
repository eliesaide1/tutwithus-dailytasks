import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { CreateProject } from "@/Shared/SharedService";
import { PROJECT_KEYS, useProjects } from "@/hooks/useTasks";
import { formValues } from "@/Shared/SharedFunctions";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLookups } from "@/hooks/useLookups";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_ProjectFields } from "@/components/AP_ProjectFields";
import { AP_ProjectItem } from "@/components/AP_ProjectItem";

export default function ProjectsScreen() {
  useDocumentTitle("Projects");
  const q = useProjects();
  const { departments } = useLookups();
  const [creating, setCreating] = useState(false);
  const create = useApiMutation((body: Record<string, unknown>) => CreateProject(body), {
    invalidate: [...PROJECT_KEYS],
  });

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    create.mutate(formValues(form), { onSuccess: () => form.reset() });
  }

  const projects = q.data ?? [];

  return (
    <div className="max-w-5xl">
      <AP_PageHeader
        title="Projects"
        count={q.data ? projects.length : undefined}
        description="Projects are the top level of the task tree (like clients in DQtasks). Every request belongs to one."
      />

      <AP_Card className="mb-6">
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex w-full items-center gap-2 px-5 py-3.5 text-sm font-semibold text-brand-700"
        >
          <Plus className="size-4" /> New project
        </button>
        {creating && (
          <form onSubmit={onCreate} className="border-t border-slate-100 px-5 py-4">
            <AP_ProjectFields departments={departments} />
            <div className="mt-3 flex justify-end">
              <AP_Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create project"}
              </AP_Button>
            </div>
          </form>
        )}
      </AP_Card>

      <AP_Card>
        <AP_CardHeader title="All projects" />
        <AP_QueryState isLoading={q.isLoading} error={q.error}>
          {projects.length === 0 ? (
            <AP_EmptyState title="No projects yet" description="Create one to start adding requests." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.map((p) => (
                <AP_ProjectItem key={p.id} p={p} departments={departments} />
              ))}
            </ul>
          )}
        </AP_QueryState>
      </AP_Card>
    </div>
  );
}
