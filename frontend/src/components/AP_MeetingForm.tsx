import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { DAYS, WEEK_ORDER } from "@/Shared/constants";
import { zoneCity } from "@/Shared/ScheduleFunctions";
import { scheduleKey } from "@/hooks/useSchedule";
import type { SchedulePerson as Person, ZoneOption } from "@/Shared/Types";
import { CreateMeeting, UpdateMeeting } from "@/Shared/SharedService";
import { useApiMutation } from "@/hooks/useApiMutation";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Button } from "@/components/AP_Button";
import { AP_Field } from "@/components/AP_Field";
import { AP_Input } from "@/components/AP_Input";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_Select } from "@/components/AP_Select";
import { AP_Textarea } from "@/components/AP_Textarea";

export type MeetingFormValues = {
  id?: string;
  title: string;
  purpose: string;
  agenda: string;
  location: string;
  recurrence: "WEEKLY" | "ONCE";
  dayOfWeek: number;
  date: string;
  start: string;
  end: string;
  timezone: string;
  validFrom: string;
  validUntil: string;
  attendees: string[];
};

export function AP_MeetingForm({ initial, people, zones }: { initial: MeetingFormValues; people: Person[]; zones: ZoneOption[] }) {
  const navigate = useNavigate();
  const [recurrence, setRecurrence] = useState(initial.recurrence);
  const save = useApiMutation(
    (body: Record<string, unknown>) =>
      initial.id ? UpdateMeeting(initial.id, body) : CreateMeeting(body),
    {
      invalidate: [scheduleKey, ["notifications"]],
      onSuccess: ({ id }) => navigate(`/schedule?tab=meetings#m-${id}`),
    },
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string | null) ?? "";
    save.mutate({
      title: get("title"),
      purpose: get("purpose"),
      agenda: get("agenda"),
      location: get("location"),
      recurrence,
      dayOfWeek: recurrence === "WEEKLY" ? Number(get("dayOfWeek")) : null,
      date: recurrence === "ONCE" ? get("date") : null,
      start: get("start"),
      end: get("end"),
      timezone: get("timezone"),
      validFrom: recurrence === "WEEKLY" ? get("validFrom") : "",
      validUntil: recurrence === "WEEKLY" ? get("validUntil") : "",
      attendees: fd.getAll("attendees").map(String),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <AP_Field label="Title" className="sm:col-span-2">
          <AP_Input name="title" defaultValue={initial.title} required maxLength={120} />
        </AP_Field>
        <AP_Field label="Purpose">
          <AP_Input name="purpose" defaultValue={initial.purpose} maxLength={200} placeholder="e.g. Marketing and sales priorities" />
        </AP_Field>
        <AP_Field label="Location / video link">
          <AP_Input name="location" defaultValue={initial.location} maxLength={300} placeholder="Google Meet, Zoom, office…" />
        </AP_Field>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">When</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <AP_Field label="Repeats">
            <AP_Select name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as "WEEKLY" | "ONCE")}>
              <option value="WEEKLY">Every week</option>
              <option value="ONCE">One time</option>
            </AP_Select>
          </AP_Field>
          {recurrence === "WEEKLY" ? (
            <AP_Field label="Day">
              <AP_Select name="dayOfWeek" defaultValue={initial.dayOfWeek}>
                {WEEK_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DAYS[d]}
                  </option>
                ))}
              </AP_Select>
            </AP_Field>
          ) : (
            <AP_Field label="Date">
              <AP_Input type="date" name="date" defaultValue={initial.date} required />
            </AP_Field>
          )}
          <AP_Field label="Time zone" hint="The times below are in this zone.">
            <AP_Select name="timezone" defaultValue={initial.timezone}>
              {zones.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </AP_Select>
          </AP_Field>
          <AP_Field label="Start (HH:MM)">
            <AP_Input type="time" name="start" defaultValue={initial.start} required step={300} />
          </AP_Field>
          <AP_Field label="End (HH:MM)">
            <AP_Input type="time" name="end" defaultValue={initial.end} required step={300} />
          </AP_Field>
          {recurrence === "WEEKLY" && <div className="hidden sm:block" />}
          {recurrence === "WEEKLY" && (
            <>
              <AP_Field label="Valid from" hint="Optional">
                <AP_Input type="date" name="validFrom" defaultValue={initial.validFrom} />
              </AP_Field>
              <AP_Field label="Valid until" hint="Optional">
                <AP_Input type="date" name="validUntil" defaultValue={initial.validUntil} />
              </AP_Field>
            </>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Attendees</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-brand-200 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input type="checkbox" name="attendees" value={p.id} defaultChecked={initial.attendees.includes(p.id)} className="size-4 accent-brand-700" />
              <AP_Avatar name={p.name} src={p.avatarUrl} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {p.title} · {zoneCity(p.timezone)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <AP_Field label="Agenda" hint="One item per line. Shown to attendees.">
        <AP_Textarea name="agenda" defaultValue={initial.agenda} rows={5} maxLength={4000} />
      </AP_Field>

      <div className="flex gap-2">
        <AP_Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : initial.id ? "Save changes" : "Create meeting"}
        </AP_Button>
        <AP_LinkButton to="/schedule?tab=meetings" variant="secondary">
          Cancel
        </AP_LinkButton>
      </div>
    </form>
  );
}
