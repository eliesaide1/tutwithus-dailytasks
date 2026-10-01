import { Link } from "react-router";
import { CircleCheck } from "lucide-react";
import type { CompletedTask } from "@/Shared/Types";
import { hours } from "@/Shared/SharedFunctions";
import { formatShortDate } from "@/Shared/format";
import { useBackHere } from "@/hooks/useBack";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Badge } from "./AP_Badge";
import { AP_EmptyState } from "./AP_EmptyState";

const completedFmt = (iso: string, zone: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Done report: every completed task in the period, newest first. */
export function AP_DoneTaskTable({ tasks, zone }: { tasks: CompletedTask[]; zone: string }) {
  const backHere = useBackHere("Done report");
  if (tasks.length === 0) return <AP_EmptyState title="No tasks were completed in this period" description="Pick another period above." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th className="px-5 py-2.5">Task</th>
            <th className="px-3 py-2.5">Done by</th>
            <th className="px-3 py-2.5">Completed</th>
            <th className="px-3 py-2.5">Due</th>
            <th className="px-5 py-2.5 text-right">Estimate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <tr key={t.id} className="align-top hover:bg-emerald-50/40">
              <td className="px-5 py-3">
                <div className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Done" />
                  <div className="min-w-0">
                    <p className="font-medium text-emerald-800">{t.title}</p>
                    {t.request && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="rounded px-1 text-[10px] leading-4 font-semibold text-white" style={{ background: t.request.project.color }}>
                          {t.request.project.code}
                        </span>
                        <Link to={`/tasks/${t.request.number}`} state={backHere} className="truncate hover:text-brand-700 hover:underline">
                          #{t.request.number} {t.request.title}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                {t.assignee ? (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <AP_Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size={24} />
                    <span className="text-slate-700">{t.assignee.name}</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Unassigned</span>
                )}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-slate-600">{completedFmt(t.completedAt, zone)}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                {t.dueDate ? (
                  <span className="flex items-center gap-2">
                    <span className="text-slate-600">{formatShortDate(t.dueDate)}</span>
                    {t.onTime ? <AP_Badge tone="green">On time</AP_Badge> : <AP_Badge tone="red">Late</AP_Badge>}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap text-slate-700">{t.estimateMins != null ? `${hours(t.estimateMins)} h` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
