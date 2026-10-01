import { useNavigate } from "react-router";
import { Trash } from "lucide-react";
import { DeleteTeam } from "@/Shared/SharedService";
import type { Team } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useInvalidatePeople } from "@/hooks/usePeople";
import { AP_Button } from "./AP_Button";
import { AP_Card } from "./AP_Card";
import { AP_Checkbox } from "./AP_Checkbox";

/** Danger zone on the team edit screen. */
export function AP_DeleteTeam({ team, counts }: { team: Team; counts: { members: number; projects: number } }) {
  const navigate = useNavigate();
  const invalidate = useInvalidatePeople();
  const del = useApiMutation(() => DeleteTeam(team.id), {
    // Leave the page first so the deleted team isn't refetched.
    onSuccess: () => {
      navigate("/teams");
      void invalidate();
    },
  });

  return (
    <AP_Card className="border-red-200 p-5">
      <h2 className="text-sm font-semibold text-red-700">Delete team</h2>
      <p className="mt-1 text-sm text-slate-600">
        Its {counts.members} member(s) and {counts.projects} project(s) are kept but will no longer belong to a team.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          del.mutate(undefined);
        }}
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <AP_Checkbox name="confirm" required label="I understand" />
        <AP_Button variant="danger" type="submit" disabled={del.isPending}>
          <Trash className="size-4" /> Delete {team.name}
        </AP_Button>
      </form>
    </AP_Card>
  );
}
