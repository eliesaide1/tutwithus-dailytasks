import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, UserPlus, X } from "lucide-react";
import { AddTeamMember, GetTeam, RemoveTeamMember } from "@/Shared/SharedService";
import type { OrgPerson, TeamResponse } from "@/Shared/Types";
import { peopleKeys, useInvalidatePeople } from "@/hooks/usePeople";
import { AP_OrgChart } from "@/components/AP_OrgChart";
import { useMe } from "@/hooks/useAuth";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Badge } from "@/components/AP_Badge";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";
import { AP_DeptCode } from "@/components/AP_DeptCode";

export default function TeamScreen() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: peopleKeys.team(id), queryFn: () => GetTeam(id) });
  useDocumentTitle(q.data?.team.name ?? "Team");
  return (
    <AP_QueryState isLoading={q.isLoading} error={q.error}>
      {q.data && <Team data={q.data} />}
    </AP_QueryState>
  );
}

function Team({ data }: { data: TeamResponse }) {
  const { team, members, openTasks, projects, others } = data;
  const manager = useMe().permissions.isManager;
  const invalidate = useInvalidatePeople();
  const [addId, setAddId] = useState("");

  const add = useApiMutation((userId: string) => AddTeamMember(team.id, userId), {
    onSuccess: () => {
      setAddId("");
      return invalidate();
    },
  });
  const remove = useApiMutation((userId: string) => RemoveTeamMember(team.id, userId), { onSuccess: () => invalidate() });

  // Mini chart: keep real reporting lines inside the team; everyone else hangs under the lead.
  const ids = new Set(members.map((m) => m.id));
  const chart: OrgPerson[] = members.map((m) => {
    if (m.id === team.lead) return { ...m, managerId: null };
    if (m.managerId && ids.has(m.managerId)) return m;
    return { ...m, managerId: team.lead && ids.has(team.lead) ? team.lead : null };
  });

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (addId) add.mutate(addId);
  }

  return (
    <div className="space-y-6">
      <AP_PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {team.name} <AP_DeptCode departmentId={team.id} className="text-base" />
          </span>
        }
        count={members.length}
        description={team.description ?? undefined}
        actions={
          manager ? (
            <AP_LinkButton to={`/teams/${team.id}/edit`} variant="secondary">
              <Pencil className="size-4" /> Edit team
            </AP_LinkButton>
          ) : undefined
        }
      />

      {members.length > 0 ? (
        <AP_OrgChart people={chart} compact initialDepth="all" />
      ) : (
        <AP_Card>
          <AP_EmptyState title="No members yet" description={manager ? "Add people below." : undefined} />
        </AP_Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <AP_Card className="lg:col-span-2">
          <AP_CardHeader title="Members" />
          {members.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">Nobody in this team.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <AP_Avatar name={m.name} src={m.avatarUrl} size={36} />
                  <Link to={`/people/${m.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-700 hover:underline">{m.name}</span>
                    <span className="block truncate text-xs text-slate-500">{m.title}</span>
                  </Link>
                  {m.id === team.lead && <AP_Badge tone="yellow">Lead</AP_Badge>}
                  {openTasks && (
                    <Link to={`/my-week?user=${m.id}`} className="text-xs text-slate-500 hover:text-brand-700">
                      {openTasks[m.id] ?? 0} open tasks
                    </Link>
                  )}
                  {manager && (
                    <button
                      type="button"
                      onClick={() => remove.mutate(m.id)}
                      disabled={remove.isPending}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${m.name} from ${team.name}`}
                      title="Remove from team"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {manager && others.length > 0 && (
            <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
              <AP_Select value={addId} onChange={(e) => setAddId(e.target.value)} required className="w-auto flex-1" aria-label="Person to add">
                <option value="" disabled>
                  Add or move someone to {team.name}…
                </option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.department ? ` (now in ${o.department.name})` : " (no team)"}
                  </option>
                ))}
              </AP_Select>
              <AP_Button type="submit" variant="secondary" disabled={add.isPending}>
                <UserPlus className="size-4" /> Add
              </AP_Button>
            </form>
          )}
        </AP_Card>

        <AP_Card>
          <AP_CardHeader title="Projects" description="Task groups owned by this team." />
          {projects.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">No projects.</p>
          ) : (
            <ul className="space-y-2 px-5 py-4">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="font-mono text-xs text-slate-500">{p.code}</span>
                  <span className="text-slate-800">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </AP_Card>
      </div>
    </div>
  );
}
