import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TIMEZONES } from "@/Shared/constants";
import { GetProfile, UpdateProfile } from "@/Shared/SharedService";
import type { ProfileResponse } from "@/Shared/Types";
import { peopleKeys, useInvalidatePeople } from "@/hooks/usePeople";
import { formValues } from "@/Shared/SharedFunctions";
import { meQueryKey, useMe } from "@/hooks/useAuth";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLookups } from "@/hooks/useLookups";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_Field } from "@/components/AP_Field";
import { AP_Input } from "@/components/AP_Input";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";
import { AP_Textarea } from "@/components/AP_Textarea";
import { useDeptCodes } from "@/hooks/useDeptCodes";

export default function ProfileEditScreen() {
  const { id = "" } = useParams();
  const me = useMe();
  const isSelf = me.id === id;
  const canManage = me.permissions.isManager;
  useDocumentTitle(isSelf ? "Edit your profile" : "Edit profile");

  const q = useQuery({
    queryKey: peopleKeys.profile(id),
    queryFn: () => GetProfile(id),
    enabled: isSelf || canManage,
  });

  if (!isSelf && !canManage) return <Navigate to="/forbidden" replace />;

  return (
    <div className="max-w-3xl">
      <AP_PageHeader title={isSelf ? "Edit your profile" : `Edit ${q.data?.person.name ?? "profile"}`} />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        {q.data && <ProfileForm data={q.data} canManage={canManage} isSelf={isSelf} />}
      </AP_QueryState>
    </div>
  );
}

function ProfileForm({ data, canManage, isSelf }: { data: ProfileResponse; canManage: boolean; isSelf: boolean }) {
  const { labelOf } = useDeptCodes();
  const { person } = data;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidatePeople = useInvalidatePeople();
  const { users, departments } = useLookups();
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl ?? "");

  const save = useApiMutation((body: Record<string, unknown>) => UpdateProfile(person.id, body), {
    onSuccess: async () => {
      await invalidatePeople();
      if (isSelf) await qc.invalidateQueries({ queryKey: meQueryKey });
      navigate(`/people/${person.id}`);
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save.mutate(formValues(e.currentTarget));
  }

  const zones = TIMEZONES.includes(person.timezone) ? TIMEZONES : [person.timezone, ...TIMEZONES];
  const managerOptions = users.filter((u) => u.id !== person.id);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {canManage && (
        <AP_Card>
          <AP_CardHeader title="Role & reporting" description="Only managers and admins can change these." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <AP_Field label="Full name">
              <AP_Input name="name" defaultValue={person.name} required />
            </AP_Field>
            <AP_Field label="Job title" hint="Shown on the org chart, e.g. CTO, COO, Social Media Manager.">
              <AP_Input name="title" defaultValue={person.title} required />
            </AP_Field>
            <AP_Field label="Reports to">
              <AP_Select name="manager" defaultValue={person.manager?.id ?? ""}>
                <option value="">— Nobody (top of the chart)</option>
                {managerOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.title}
                  </option>
                ))}
              </AP_Select>
            </AP_Field>
            <AP_Field label="Team">
              <AP_Select name="department" defaultValue={person.department?.id ?? ""}>
                <option value="">— No team</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {labelOf(d.name, d.id)}
                  </option>
                ))}
              </AP_Select>
            </AP_Field>
            <AP_Field label="Weekly capacity (hours)">
              <AP_Input name="weeklyCapacityHours" type="number" min={0} max={80} step={0.25} defaultValue={person.weeklyCapacityMins / 60} />
            </AP_Field>
            <AP_Field label="Urgent contact preference">
              <AP_Input name="urgentContact" defaultValue={person.urgentContact ?? ""} placeholder="e.g. WhatsApp, 30-60 minutes' notice" />
            </AP_Field>
            <AP_Field label="Responsibilities" className="sm:col-span-2">
              <AP_Textarea name="responsibilities" defaultValue={person.responsibilities ?? ""} rows={4} />
            </AP_Field>
          </div>
        </AP_Card>
      )}

      <AP_Card>
        <AP_CardHeader title="Contact & profile" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <AP_Field label="Phone">
            <AP_Input name="phone" type="tel" defaultValue={person.phone ?? ""} placeholder="+961 …" />
          </AP_Field>
          <AP_Field label="WhatsApp number">
            <AP_Input name="whatsapp" type="tel" defaultValue={person.whatsapp ?? ""} placeholder="+966 …" />
          </AP_Field>
          <AP_Field label="Time zone" hint="All meeting times are shown to you in this zone.">
            <AP_Select name="timezone" defaultValue={person.timezone}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Photo URL" hint="Paste a link to an image.">
            <div className="flex items-center gap-3">
              <AP_Avatar name={person.name} src={avatarUrl || null} size={36} />
              <AP_Input name="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            </div>
          </AP_Field>
          <AP_Field label="About" className="sm:col-span-2">
            <AP_Textarea name="bio" defaultValue={person.bio ?? ""} rows={3} placeholder="A short introduction for the team." />
          </AP_Field>
        </div>
      </AP_Card>

      <div className="flex gap-2">
        <AP_Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </AP_Button>
        <AP_LinkButton to={`/people/${person.id}`} variant="secondary">
          Cancel
        </AP_LinkButton>
      </div>
    </form>
  );
}
