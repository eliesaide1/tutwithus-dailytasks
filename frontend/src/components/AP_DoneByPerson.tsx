import type { CompletedReport } from "@/Shared/Types";
import { hours } from "@/Shared/SharedFunctions";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Card } from "./AP_Card";
import { AP_CardHeader } from "./AP_CardHeader";
import { AP_EmptyState } from "./AP_EmptyState";

/** Done report: tasks completed per person, with hours and on-time / late counts. */
export function AP_DoneByPerson({ rows, total }: { rows: CompletedReport["byPerson"]; total: number }) {
  return (
    <AP_Card>
      <AP_CardHeader title="By person" description="Tasks completed and estimated hours" />
      {rows.length === 0 ? (
        <AP_EmptyState title="No completed tasks" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.person?.id ?? "unassigned"} className="flex items-center gap-3 px-5 py-3">
              {r.person ? <AP_Avatar name={r.person.name} src={r.person.avatarUrl} size={32} /> : <span className="size-8 rounded-full bg-slate-100" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{r.person?.name ?? "Unassigned"}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="w-28 shrink-0 text-right">
                <p className="text-sm font-semibold text-emerald-700">
                  {r.count} done <span className="font-normal text-slate-500">· {hours(r.estimateMins)} h</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {r.onTime} on time{r.late ? <span className="text-red-600"> · {r.late} late</span> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AP_Card>
  );
}
