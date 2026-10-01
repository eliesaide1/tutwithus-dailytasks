import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { GetTeams } from "@/Shared/SharedService";
import { peopleKeys } from "@/hooks/usePeople";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Card } from "@/components/AP_Card";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_TeamCard } from "@/components/AP_TeamCard";

export default function TeamsScreen() {
  useDocumentTitle("Teams");
  const me = useMe();
  const q = useQuery({ queryKey: peopleKeys.teams, queryFn: GetTeams });
  const teams = q.data?.teams ?? [];
  const unassigned = q.data?.unassigned ?? 0;

  return (
    <>
      <AP_PageHeader
        title="Teams"
        count={q.data ? teams.length : undefined}
        description={unassigned ? `${unassigned} active ${unassigned === 1 ? "person is" : "people are"} not in a team yet.` : "Every team, its lead and its current workload."}
        actions={
          me.permissions.isManager ? (
            <AP_LinkButton to="/teams/new">
              <Plus className="size-4" /> New team
            </AP_LinkButton>
          ) : undefined
        }
      />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
      {teams.length === 0 ? (
        <AP_Card>
          <AP_EmptyState title="No teams yet" description="Create teams to group people on the org chart." />
        </AP_Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <AP_TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
      </AP_QueryState>
    </>
  );
}
