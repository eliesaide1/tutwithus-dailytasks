// Meetings tab: recurring and one-off meetings with RSVP and availability warnings.
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Check, Clock, MapPin, Pencil, TriangleAlert, Users, X } from "lucide-react";
import { DAYS } from "@/Shared/constants";
import { formatRange, zoneLabel } from "@/Shared/time";
import { cn } from "@/Shared/format";
import { zoneCity } from "@/Shared/ScheduleFunctions";
import { scheduleKey } from "@/hooks/useSchedule";
import type { ScheduleMeeting } from "@/Shared/Types";
import { RsvpMeeting } from "@/Shared/SharedService";
import { useApiMutation } from "@/hooks/useApiMutation";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Badge } from "@/components/AP_Badge";
import { AP_Card } from "@/components/AP_Card";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_LinkButton } from "@/components/AP_LinkButton";

const rsvpTone = { CONFIRMED: "green", PENDING: "amber", DECLINED: "red" } as const;
const rsvpLabel = { CONFIRMED: "Confirmed", PENDING: "To confirm", DECLINED: "Declined" } as const;

export function AP_MeetingsList({
  meetings,
  week,
  zone,
  viewerId,
  manager,
}: {
  meetings: ScheduleMeeting[];
  week: string;
  zone: string;
  viewerId: string;
  manager: boolean;
}) {
  const { hash } = useLocation();
  const rsvp = useApiMutation(({ id, status }: { id: string; status: string }) => RsvpMeeting(id, status), {
    invalidate: [scheduleKey, ["notifications"]],
  });

  // Scroll to #m-<id> links from notifications once the list is rendered.
  useEffect(() => {
    if (hash.startsWith("#m-")) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, meetings.length]);

  if (!meetings.length) {
    return (
      <AP_Card>
        <AP_EmptyState
          title="No meetings yet"
          description="Recurring check-ins and team meetings will show up here."
          action={manager && <AP_LinkButton to="/schedule/meetings/new">New meeting</AP_LinkButton>}
        />
      </AP_Card>
    );
  }

  const weekStart = new Date(`${week}T00:00:00Z`);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {meetings.map((m) => {
          const occ = m.occurrence;
          const mine = m.attendees.find((a) => a.userId === viewerId);
          const ended = m.recurrence === "WEEKLY" && m.validUntil && new Date(m.validUntil) < weekStart;
          return (
            <AP_Card key={m.id} id={`m-${m.id}`} className={cn("scroll-mt-24 p-5", ended && "opacity-60", hash === `#m-${m.id}` && "ring-2 ring-accent-400")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{m.title}</h3>
                  {m.purpose && <p className="text-sm text-slate-500">{m.purpose}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <AP_Badge tone={m.recurrence === "WEEKLY" ? "blue" : "purple"}>{m.recurrence === "WEEKLY" ? "Weekly" : "One time"}</AP_Badge>
                  {manager && (
                    <Link
                      to={`/schedule/meetings/${m.id}`}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Edit meeting"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-slate-400" />
                  <span>
                    {m.recurrence === "WEEKLY"
                      ? `${DAYS[m.dayOfWeek ?? 0]}s ${formatRange(m.startMinute, m.endMinute)}`
                      : `${
                          m.date
                            ? new Date(m.date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                              })
                            : ""
                        } ${formatRange(m.startMinute, m.endMinute)}`}
                    <span className="text-slate-400"> · {zoneLabel(m.timezone, occ ? new Date(occ.start) : weekStart)}</span>
                  </span>
                </p>
                {occ && m.timezone !== zone && (
                  <p className="pl-6 text-xs text-slate-500">
                    This week in {zoneCity(zone)}: <strong>{occ.local}</strong>
                  </p>
                )}
                {m.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 text-slate-400" />
                    {/^https?:\/\//.test(m.location) ? (
                      <a href={m.location} target="_blank" rel="noreferrer" className="truncate text-brand-600 hover:underline">
                        {m.location}
                      </a>
                    ) : (
                      m.location
                    )}
                  </p>
                )}
                {(m.validFrom || m.validUntil) && (
                  <p className="pl-6 text-xs text-slate-500">
                    {m.validFrom && `From ${m.validFrom.slice(0, 10)} `}
                    {m.validUntil && `until ${m.validUntil.slice(0, 10)}`}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <Users className="size-3.5" /> Attendees ({m.attendees.length})
                </p>
                <ul className="flex flex-wrap gap-2">
                  {m.attendees.map((a) => {
                    const status = a.status as keyof typeof rsvpTone;
                    return (
                      <li key={a.userId} className="flex items-center gap-1.5 rounded-full bg-slate-50 py-0.5 pr-2 pl-0.5 ring-1 ring-slate-200">
                        <AP_Avatar name={a.name} src={a.avatarUrl} size={22} />
                        <span className="text-xs font-medium text-slate-700">{a.name.split(" ")[0]}</span>
                        <AP_Badge tone={rsvpTone[status] ?? "slate"} className="px-1.5 py-0 text-[10px]">
                          {rsvpLabel[status] ?? a.status}
                        </AP_Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {m.conflicts.length > 0 && (
                <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" />
                  <span>
                    Outside declared availability:{" "}
                    {m.conflicts.map((w, i) => (
                      <span key={w.name}>
                        {i > 0 && ", "}
                        <strong>{w.name}</strong> ({w.local})
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {m.agenda && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs font-semibold text-brand-600">Agenda</summary>
                  <p className="mt-2 whitespace-pre-line text-slate-600">{m.agenda}</p>
                </details>
              )}

              {mine && (
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="mr-auto text-xs text-slate-500">Your answer:</span>
                  {(["CONFIRMED", "DECLINED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={rsvp.isPending}
                      onClick={() => rsvp.mutate({ id: m.id, status: mine.status === s ? "PENDING" : s })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset disabled:opacity-60",
                        mine.status === s
                          ? s === "CONFIRMED"
                            ? "bg-emerald-600 text-white ring-emerald-600"
                            : "bg-red-600 text-white ring-red-600"
                          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                      )}
                    >
                      {s === "CONFIRMED" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                      {s === "CONFIRMED" ? "Confirm" : "Decline"}
                    </button>
                  ))}
                </div>
              )}
            </AP_Card>
          );
        })}
      </div>
    </>
  );
}
