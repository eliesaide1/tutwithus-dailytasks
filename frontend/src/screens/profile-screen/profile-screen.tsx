import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { CalendarClock, Clock, ListTodo, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { ROLE_LABELS } from "@/Shared/constants";
import { formatMinute, utcToZoned, zoneLabel } from "@/Shared/time";
import { formatDuration } from "@/Shared/format";
import { GetProfile } from "@/Shared/SharedService";
import { whatsappHref } from "@/Shared/SharedFunctions";
import type { ProfileResponse } from "@/Shared/Types";
import { peopleKeys } from "@/hooks/usePeople";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Badge } from "@/components/AP_Badge";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_PersonLink } from "@/components/AP_PersonLink";
import { AP_ProfileStat } from "@/components/AP_ProfileStat";
import { AP_WeeklyAvailability } from "@/components/AP_WeeklyAvailability";
import { AP_DeptCode } from "@/components/AP_DeptCode";

export default function ProfileScreen() {
  const { id = "" } = useParams();
  const q = useQuery({
    queryKey: peopleKeys.profile(id),
    queryFn: () => GetProfile(id),
  });
  useDocumentTitle(q.data?.person.name ?? "Profile");
  return (
    <AP_QueryState isLoading={q.isLoading} error={q.error}>
      {q.data && <Profile data={q.data} />}
    </AP_QueryState>
  );
}

function Profile({ data }: { data: ProfileResponse }) {
  const { person, reports, availability, stats, canEdit } = data;
  const now = new Date();
  const local = formatMinute(utcToZoned(now, person.timezone).minute);

  return (
    <div className="space-y-6">
      <AP_Card className="relative overflow-hidden">
        <div className="h-20 bg-brand-800" style={person.department ? { background: `linear-gradient(90deg, #08234f, ${person.department.color})` } : undefined} />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <AP_Avatar name={person.name} src={person.avatarUrl} size={88} className="-mt-10 ring-4 ring-white" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-brand-800">{person.name}</h1>
            <p className="text-slate-600">{person.title}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {person.department && (
                <Link to={`/teams/${person.department.id}`}>
                  <AP_Badge tone="blue">
                    <span className="size-2 rounded-full" style={{ background: person.department.color }} />
                    {person.department.name}
                  </AP_Badge>
                  <AP_DeptCode departmentId={person.department.id} className="ml-1" />
                </Link>
              )}
              <AP_Badge>{ROLE_LABELS[person.role] ?? person.role}</AP_Badge>
              {!person.active && <AP_Badge tone="red">Deactivated</AP_Badge>}
            </div>
          </div>
          {canEdit && (
            <AP_LinkButton to={`/people/${person.id}/edit`} variant="secondary">
              <Pencil className="size-4" /> Edit profile
            </AP_LinkButton>
          )}
        </div>
      </AP_Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {person.bio && (
            <AP_Card>
              <AP_CardHeader title="About" />
              <p className="px-5 py-4 text-sm whitespace-pre-line text-slate-700">{person.bio}</p>
            </AP_Card>
          )}

          <AP_Card>
            <AP_CardHeader title="Responsibilities" description="Declared work and what to bring to check-ins." />
            <p className="px-5 py-4 text-sm whitespace-pre-line text-slate-700">
              {person.responsibilities ?? <span className="text-slate-400">Not set yet.</span>}
            </p>
          </AP_Card>

          <AP_Card>
            <AP_CardHeader
              title="Weekly availability"
              description={`In ${person.name.split(" ")[0]}'s local time · ${zoneLabel(person.timezone, now)}`}
              action={
                <Link to={`/schedule?tab=availability`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                  <CalendarClock className="size-3.5" /> Open schedule
                </Link>
              }
            />
            <AP_WeeklyAvailability availability={availability} />
          </AP_Card>
        </div>

        <div className="space-y-6">
          <AP_Card>
            <AP_CardHeader title="Contact" />
            <div className="space-y-2.5 px-5 py-4 text-sm">
              <p className="flex items-center gap-2 text-slate-700">
                <Clock className="size-4 text-slate-400" />
                <span className="font-semibold">{local}</span>
                <span className="text-xs text-slate-500">{zoneLabel(person.timezone, now)}</span>
              </p>
              <a href={`mailto:${person.email}`} className="flex items-center gap-2 break-all text-slate-700 hover:text-brand-700">
                <Mail className="size-4 shrink-0 text-slate-400" /> {person.email}
              </a>
              {person.phone && (
                <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-brand-700">
                  <Phone className="size-4 text-slate-400" /> {person.phone}
                </a>
              )}
              {person.whatsapp && (
                <a href={whatsappHref(person.whatsapp)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline">
                  <MessageCircle className="size-4" /> WhatsApp {person.whatsapp}
                </a>
              )}
              {person.urgentContact && (
                <div className="rounded-lg bg-accent-100/60 px-3 py-2 text-xs text-amber-900">
                  <span className="font-semibold">Urgent contact: </span>
                  {person.urgentContact}
                </div>
              )}
            </div>
          </AP_Card>

          <AP_Card>
            <AP_CardHeader title="Work" />
            <div className="grid grid-cols-2 gap-3 px-5 py-4">
              <AP_ProfileStat label="Weekly capacity" value={person.weeklyCapacityMins ? formatDuration(person.weeklyCapacityMins) : "—"} />
              {stats && <AP_ProfileStat label="Open tasks" value={String(stats.openTasks)} />}
              {stats && <AP_ProfileStat label="Overdue" value={String(stats.overdueTasks)} tone={stats.overdueTasks ? "text-red-600" : undefined} />}
              <AP_ProfileStat label="Valid until" value={person.validUntil ? person.validUntil.slice(0, 10) : "Ongoing"} />
            </div>
            {stats && (
              <div className="border-t border-slate-100 px-5 py-3">
                <Link to={`/my-week?user=${person.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
                  <ListTodo className="size-4" /> View their week
                </Link>
              </div>
            )}
          </AP_Card>

          <AP_Card>
            <AP_CardHeader title="Reporting line" />
            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="label">Reports to</p>
                {person.manager ? <AP_PersonLink p={person.manager} /> : <p className="text-sm text-slate-400">No manager (top of the chart)</p>}
              </div>
              <div>
                <p className="label">Direct reports ({reports.length})</p>
                {reports.length === 0 ? (
                  <p className="text-sm text-slate-400">None</p>
                ) : (
                  <ul className="space-y-2">
                    {reports.map((r) => (
                      <li key={r.id}>
                        <AP_PersonLink p={r} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </AP_Card>
        </div>
      </div>
    </div>
  );
}
