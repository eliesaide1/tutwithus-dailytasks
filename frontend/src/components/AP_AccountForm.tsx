import type { FormEvent } from "react";
import { ROLES, ROLE_LABELS, TIMEZONES } from "@/Shared/constants";
import { formValues } from "@/Shared/SharedFunctions";
import { useLookups } from "@/hooks/useLookups";
import { AP_Button } from "./AP_Button";
import { AP_Card } from "./AP_Card";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_LinkButton } from "./AP_LinkButton";
import { AP_Select } from "./AP_Select";
import { useDeptCodes } from "@/hooks/useDeptCodes";

export type AccountValues = {
  name: string;
  email: string;
  title: string;
  role: string;
  department: string;
  manager: string;
  timezone: string;
  weeklyCapacityHours: number;
};

/** Create / edit an account (admins): name, email, title, role, team, manager, zone, capacity. */
export function AP_AccountForm({
  userId,
  values,
  submitLabel,
  pending,
  success,
  onSubmit,
}: {
  /** The account being edited (excluded from "Reports to"). */
  userId?: string;
  values: AccountValues;
  submitLabel: string;
  pending: boolean;
  success?: string | null;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const { labelOf } = useDeptCodes();
  const { users, departments } = useLookups();
  const zones = TIMEZONES.includes(values.timezone) ? TIMEZONES : [values.timezone, ...TIMEZONES];

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(formValues(e.currentTarget));
  }

  return (
    <form onSubmit={submit}>
      <AP_Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <AP_Field label="Full name">
            <AP_Input name="name" defaultValue={values.name} required />
          </AP_Field>
          <AP_Field label="Email (sign-in)">
            <AP_Input name="email" type="email" defaultValue={values.email} required />
          </AP_Field>
          <AP_Field label="Job title" hint="e.g. CEO, COO, CTO, Social Media Manager">
            <AP_Input name="title" defaultValue={values.title} required />
          </AP_Field>
          <AP_Field label="Access role" hint="Admin: everything. Manager: assign tasks, edit schedules and teams. Member: own work.">
            <AP_Select name="role" defaultValue={values.role}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Team">
            <AP_Select name="department" defaultValue={values.department}>
              <option value="">— No team</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {labelOf(d.name, d.id)}
                </option>
              ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Reports to">
            <AP_Select name="manager" defaultValue={values.manager}>
              <option value="">— Nobody (top of the chart)</option>
              {users
                .filter((p) => p.id !== userId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.title}
                  </option>
                ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Time zone">
            <AP_Select name="timezone" defaultValue={values.timezone}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Weekly capacity (hours)">
            <AP_Input name="weeklyCapacityHours" type="number" min={0} max={80} step={0.25} defaultValue={values.weeklyCapacityHours} />
          </AP_Field>
        </div>
        {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">{success}</p>}
        <div className="flex gap-2">
          <AP_Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </AP_Button>
          <AP_LinkButton to="/admin/users" variant="secondary">
            Cancel
          </AP_LinkButton>
        </div>
      </AP_Card>
    </form>
  );
}
