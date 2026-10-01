import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { GetTeam, GetTeams } from "@/Shared/SharedService";
import { peopleKeys } from "@/hooks/usePeople";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_TeamForm } from "@/components/AP_TeamForm";
import { AP_DeleteTeam } from "@/components/AP_DeleteTeam";

/** /teams/new and /teams/:id/edit */
export default function TeamFormScreen() {
  const { id } = useParams();
  useDocumentTitle(id ? "Edit team" : "New team");

  const existing = useQuery({
    queryKey: peopleKeys.team(id ?? ""),
    queryFn: () => GetTeam(id ?? ""),
    enabled: !!id,
  });
  const list = useQuery({
    queryKey: peopleKeys.teams,
    queryFn: GetTeams,
    enabled: !id,
  });

  if (!id) {
    return (
      <div className="max-w-2xl">
        <AP_PageHeader title="New team" />
        <AP_QueryState isLoading={list.isLoading} error={list.error}>
          <AP_TeamForm values={{ name: "", description: "", color: "#0b2f6b", lead: "", order: list.data?.teams.length ?? 0 }} />
        </AP_QueryState>
      </div>
    );
  }

  const team = existing.data?.team;
  return (
    <div className="max-w-2xl space-y-6">
      <AP_PageHeader title={team ? `Edit ${team.name}` : "Edit team"} />
      <AP_QueryState isLoading={existing.isLoading} error={existing.error}>
        {team && existing.data && (
          <>
            <AP_TeamForm
              team={team}
              values={{ name: team.name, description: team.description ?? "", color: team.color, lead: team.lead ?? "", order: team.order }}
            />
            <AP_DeleteTeam team={team} counts={existing.data.counts} />
          </>
        )}
      </AP_QueryState>
    </div>
  );
}
