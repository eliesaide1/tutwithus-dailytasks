import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo, Pin } from "lucide-react";
import type { ReactNode } from "react";
import { DAYS } from "@/Shared/constants";
import { utcToZoned } from "@/Shared/time";
import { cn, formatAge } from "@/Shared/format";
import { GetDashboard } from "@/Shared/SharedService";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useBackHere } from "@/hooks/useBack";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_ActivityList } from "@/components/AP_ActivityList";
import { AP_StatCard } from "@/components/AP_StatCard";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_PriorityBadge } from "@/components/AP_PriorityBadge";
import { AP_TaskStatusBadge } from "@/components/AP_TaskStatusBadge";

export default function DashboardScreen() {
  useDocumentTitle("Dashboard");
  const user = useMe();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: GetDashboard });

  const now = new Date();
  const local = utcToZoned(now, user.timezone);
  const hour = Math.floor(local.minute / 60);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const backHere = useBackHere("Dashboard");
  const manager = user.permissions.canSeeAllTasks; // team overview shows everyone's task counts

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-800">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {DAYS[local.dayOfWeek]} · {user.title}
          </p>
        </div>
        <div className="flex gap-2">
          <AP_LinkButton to="/my-week" variant="secondary">
            My week
          </AP_LinkButton>
          {user.permissions.canManageTasks && <AP_LinkButton to="/tasks/new">New request</AP_LinkButton>}
        </div>
      </div>

      <AP_QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <AP_StatCard icon={<ListTodo className="size-5" />} label="Open tasks" value={data.stats.open} />
              <AP_StatCard icon={<CalendarClock className="size-5" />} label="Due this week" value={data.stats.dueThisWeek} />
              <AP_StatCard icon={<AlertTriangle className="size-5" />} label="Overdue" value={data.stats.overdue} tone={data.stats.overdue ? "red" : undefined} />
              <AP_StatCard icon={<CheckCircle2 className="size-5" />} label="Blocked" value={data.stats.blocked} tone={data.stats.blocked ? "amber" : undefined} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <AP_Card className="lg:col-span-2">
                <AP_CardHeader title="My open tasks" action={<MoreLink to="/my-week">View week →</MoreLink>} />
                {data.tasks.length === 0 ? (
                  <AP_EmptyState title="Nothing assigned to you" description="Tasks assigned to you will appear here." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.tasks.map((t) => {
                      const due = t.dueDate ? new Date(t.dueDate) : null;
                      const late = due && due < now;
                      return (
                        <li key={t.id}>
                          <Link to={`/tasks/${t.request.number}`} state={backHere} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                            <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: t.request.project.color }} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                              <p className="truncate text-xs text-slate-500">
                                {t.request.project.code} · #{t.request.number} {t.request.title}
                              </p>
                            </div>
                            <div className="hidden shrink-0 items-center gap-2 sm:flex">
                              <AP_PriorityBadge priority={t.request.priority} />
                              <AP_TaskStatusBadge status={t.status} />
                            </div>
                            {due && (
                              <span className={cn("w-28 shrink-0 text-right text-xs", late ? "font-semibold text-red-600" : "text-slate-500")}>
                                {late ? formatAge(due, now) : `due ${formatAge(due, now)}`}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </AP_Card>

              <AP_Card>
                <AP_CardHeader title="Upcoming meetings" description="Next 7 days, in your time zone" action={<MoreLink to="/schedule">Schedule →</MoreLink>} />
                {data.meetings.length === 0 ? (
                  <AP_EmptyState title="No meetings this week" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.meetings.map((m) => (
                      <li key={`${m.id}-${m.start}`} className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">{m.title}</p>
                        <p className="text-xs text-slate-500">
                          {m.day} · {m.time}
                        </p>
                        <div className="mt-2 flex -space-x-1.5">
                          {m.attendees.map((a) => (
                            <AP_Avatar key={a.id} name={a.name} src={a.avatarUrl} size={22} className="ring-2 ring-white" />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </AP_Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <AP_Card className={manager ? "" : "lg:col-span-3"}>
                <AP_CardHeader title="Announcements" action={<MoreLink to="/announcements">All →</MoreLink>} />
                {data.announcements.length === 0 ? (
                  <AP_EmptyState title="No announcements" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.announcements.map((a) => (
                      <li key={a.id} className="px-5 py-3">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                          {a.pinned && <Pin className="size-3.5 text-accent-600" />}
                          {a.title}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs text-slate-600">{a.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </AP_Card>

              {/* Team activity: admins only (Charbel, Elie, Gabriel). */}
              {manager && (
                <AP_Card>
                  <AP_CardHeader title="Team activity" />
                  <AP_ActivityList items={data.activity} compact />
                </AP_Card>
              )}

              {manager && (
                <AP_Card>
                  <AP_CardHeader title="Team at a glance" description="Open and overdue tasks per person" action={<MoreLink to="/workload">Workload →</MoreLink>} />
                  <ul className="divide-y divide-slate-100">
                    {data.team.map((p) => (
                      <li key={p.id}>
                        <Link to={`/my-week?user=${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                          <AP_Avatar name={p.name} src={p.avatarUrl} size={28} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                            <p className="truncate text-xs text-slate-500">{p.title}</p>
                          </div>
                          <span className="text-xs text-slate-600">{p.open} open</span>
                          {p.overdue > 0 && <span className="text-xs font-semibold text-red-600">{p.overdue} late</span>}
                          {p.blocked > 0 && <span className="text-xs font-semibold text-amber-600">{p.blocked} blocked</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AP_Card>
              )}
            </div>
          </>
        )}
      </AP_QueryState>
    </div>
  );
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-xs font-medium text-brand-600 hover:underline">
      {children}
    </Link>
  );
}
