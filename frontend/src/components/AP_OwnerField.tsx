import { Lock } from "lucide-react";
import type { ProjectTeam } from "@/Shared/Types";
import { fullTitle } from "@/Shared/SharedFunctions";
import { AP_Avatar } from "./AP_Avatar";

/**
 * Read-only owner of a request: always the manager of the project's department
 * (e.g. DEV → the CTO). Set by the backend, so it can't be picked here.
 */
export function AP_OwnerField({
  team,
  loading,
  noProject,
  fallback,
}: {
  team: ProjectTeam | undefined;
  loading?: boolean;
  /** No project chosen yet. */
  noProject?: boolean;
  /** Shown when the project's department has no manager (the request keeps its owner / goes to you). */
  fallback: string;
}) {
  const lead = team?.lead;
  return (
    <div>
      <span className="label">Owner</span>
      <div
        className="flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600"
        aria-readonly="true"
        title="The owner is the manager of the project's department and can't be changed."
      >
        {noProject ? (
          <span className="text-slate-400">Choose a project first</span>
        ) : loading ? (
          <span className="text-slate-400">Loading…</span>
        ) : lead ? (
          <>
            <AP_Avatar name={lead.name} src={lead.avatarUrl} size={22} />
            <span className="font-medium text-slate-800" title={team?.department ? `Manager of ${team.department.name}` : undefined}>
              {lead.name}
            </span>
            <span className="truncate text-xs text-slate-500">{fullTitle(lead.title)}</span>
          </>
        ) : (
          <span>{fallback}</span>
        )}
        <Lock className="ml-auto size-3.5 shrink-0 text-slate-400" aria-hidden />
      </div>
    </div>
  );
}
