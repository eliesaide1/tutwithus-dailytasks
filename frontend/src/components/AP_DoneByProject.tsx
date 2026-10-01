import type { CompletedReport } from "@/Shared/Types";
import { hours } from "@/Shared/SharedFunctions";
import { AP_Card } from "./AP_Card";
import { AP_CardHeader } from "./AP_CardHeader";
import { AP_EmptyState } from "./AP_EmptyState";

/** Done report: tasks completed per project. */
export function AP_DoneByProject({ rows, total }: { rows: CompletedReport["byProject"]; total: number }) {
  return (
    <AP_Card>
      <AP_CardHeader title="By project" description="Where the work went" />
      {rows.length === 0 ? (
        <AP_EmptyState title="No completed tasks" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.project.id} className="flex items-center gap-3 px-5 py-3">
              <span className="size-3 shrink-0 rounded" style={{ background: r.project.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {r.project.name} <span className="text-xs font-normal text-slate-400">{r.project.code}</span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${total ? (r.count / total) * 100 : 0}%`, background: r.project.color }} />
                </div>
              </div>
              <p className="w-28 shrink-0 text-right text-sm font-semibold text-slate-800">
                {r.count} <span className="font-normal text-slate-500">· {hours(r.estimateMins)} h</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </AP_Card>
  );
}
