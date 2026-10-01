import { useState } from "react";
import { Link } from "react-router";
import { Pencil, Trash } from "lucide-react";
import { DeleteProject, UpdateProject } from "@/Shared/SharedService";
import { formValues } from "@/Shared/SharedFunctions";
import type { ProjectRow } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { PROJECT_KEYS } from "@/hooks/useTasks";
import { AP_Badge } from "./AP_Badge";
import { AP_Button } from "./AP_Button";
import { AP_ProjectFields } from "./AP_ProjectFields";

/** One project in the admin list, with links, edit form and delete. */
export function AP_ProjectItem({ p, departments }: { p: ProjectRow; departments: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const update = useApiMutation((body: Record<string, unknown>) => UpdateProject(p.id, body), {
    invalidate: [...PROJECT_KEYS],
    onSuccess: () => setEditing(false),
  });
  const del = useApiMutation(() => DeleteProject(p.id), { invalidate: [...PROJECT_KEYS] });

  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded px-2 py-0.5 text-xs font-bold text-white" style={{ background: p.color }}>
          {p.code}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {p.name} {p.archived && <AP_Badge tone="slate">Archived</AP_Badge>}
          </p>
          <p className="text-xs text-slate-500">
            {p.department?.name ?? "No team"} · {p.openRequests} open / {p.totalRequests} total requests
            {p.description && <> · {p.description}</>}
          </p>
        </div>
        <Link to={`/tasks?project=${p.id}&show=all`} className="text-xs text-brand-700 hover:underline">
          View tasks
        </Link>
        <Link to={`/tasks/new?project=${p.id}`} className="text-xs text-brand-700 hover:underline">
          New request
        </Link>
        {p.totalRequests === 0 && (
          <button
            type="button"
            onClick={() => confirm(`Delete project ${p.code}?`) && del.mutate(undefined)}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete project"
          >
            <Trash className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-2">
        <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
          <Pencil className="size-3" /> Edit
        </button>
        {editing && (
          <form
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate(formValues(e.currentTarget));
            }}
          >
            <AP_ProjectFields departments={departments} project={p} />
            <div className="mt-3 flex justify-end">
              <AP_Button type="submit" size="sm" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save"}
              </AP_Button>
            </div>
          </form>
        )}
      </div>
    </li>
  );
}
