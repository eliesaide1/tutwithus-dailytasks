import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { CreateTeam, UpdateTeam } from "@/Shared/SharedService";
import { formValues } from "@/Shared/SharedFunctions";
import type { Team } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useInvalidatePeople } from "@/hooks/usePeople";
import { useLookups } from "@/hooks/useLookups";
import { AP_Button } from "./AP_Button";
import { AP_Card } from "./AP_Card";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_LinkButton } from "./AP_LinkButton";
import { AP_Select } from "./AP_Select";
import { AP_Textarea } from "./AP_Textarea";

const SWATCHES = ["#0b2f6b", "#7c3aed", "#0891b2", "#f5bd1f", "#059669", "#dc2626", "#db2777", "#ea580c", "#475569"];

export type TeamFormValues = { name: string; description: string; color: string; lead: string; order: number };

/** Create or edit a team: name, description, lead, order and colour. */
export function AP_TeamForm({ team, values }: { team?: Team; values: TeamFormValues }) {
  const navigate = useNavigate();
  const invalidate = useInvalidatePeople();
  const { users } = useLookups();
  const save = useApiMutation(
    (body: Record<string, unknown>) =>
      team ? UpdateTeam(team.id, body) : CreateTeam(body),
    {
      onSuccess: async (res) => {
        await invalidate();
        navigate(`/teams/${res.team.id}`);
      },
    },
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save.mutate(formValues(e.currentTarget));
  }

  return (
    <form onSubmit={onSubmit}>
      <AP_Card className="space-y-4 p-5">
        <AP_Field label="Team name">
          <AP_Input name="name" defaultValue={values.name} required placeholder="e.g. Sales & Marketing" />
        </AP_Field>
        <AP_Field label="Description">
          <AP_Textarea name="description" defaultValue={values.description} rows={3} />
        </AP_Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <AP_Field label="Team lead" hint="The lead is added to the team automatically.">
            <AP_Select name="lead" defaultValue={values.lead}>
              <option value="">— No lead</option>
              {users.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.title}
                </option>
              ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Display order">
            <AP_Input name="order" type="number" min={0} defaultValue={values.order} />
          </AP_Field>
        </div>
        <fieldset>
          <legend className="label">Colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={values.color === c} className="peer sr-only" />
                <span
                  className="block size-8 rounded-full ring-2 ring-transparent ring-offset-2 peer-checked:ring-brand-700 peer-focus-visible:ring-brand-500"
                  style={{ background: c }}
                  aria-label={c}
                />
              </label>
            ))}
            {!SWATCHES.includes(values.color) && (
              <label className="cursor-pointer">
                <input type="radio" name="color" value={values.color} defaultChecked className="peer sr-only" />
                <span className="block size-8 rounded-full ring-2 ring-transparent ring-offset-2 peer-checked:ring-brand-700" style={{ background: values.color }} />
              </label>
            )}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <AP_Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save team"}
          </AP_Button>
          <AP_LinkButton to={team ? `/teams/${team.id}` : "/teams"} variant="secondary">
            Cancel
          </AP_LinkButton>
        </div>
      </AP_Card>
    </form>
  );
}
