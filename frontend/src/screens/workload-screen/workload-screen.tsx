import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "@/Shared/time";
import { cn, formatDuration, formatShortDate, toDateInput } from "@/Shared/format";
import { GetWorkload } from "@/Shared/SharedService";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParam } from "@/hooks/useQueryParam";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";

export default function WorkloadScreen() {
  useDocumentTitle("Workload");
  const [week, setWeek] = useQueryParam("week");
  const { data, isLoading, error } = useQuery({
    queryKey: ["workload", week],
    queryFn: () => GetWorkload(week),
  });

  const weekStart = data ? new Date(data.weekStart) : null;
  const shift = (days: number) => weekStart && setWeek(toDateInput(addDays(weekStart, days)));

  return (
    <div>
      <AP_PageHeader
        title="Workload"
        description="Declared weekly capacity minus meetings and planned task estimates."
        actions={
          <div className="flex items-center gap-1">
            <AP_Button variant="secondary" size="sm" aria-label="Previous week" onClick={() => shift(-7)}>
              <ChevronLeft className="size-4" />
            </AP_Button>
            <span className="px-3 text-sm font-medium text-slate-700">
              {weekStart ? `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}` : "…"}
            </span>
            <AP_Button variant="secondary" size="sm" aria-label="Next week" onClick={() => shift(7)}>
              <ChevronRight className="size-4" />
            </AP_Button>
            <AP_Button variant="ghost" size="sm" onClick={() => setWeek(null)}>
              This week
            </AP_Button>
          </div>
        }
      />

      <AP_QueryState isLoading={isLoading} error={error}>
        <AP_Card>
          <AP_CardHeader
            title="Capacity this week"
            description="Bars: meetings (navy), planned tasks (yellow, done part solid), free capacity (grey). Red means over capacity."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-2.5">Person</th>
                  <th className="px-3 py-2.5">Capacity</th>
                  <th className="px-3 py-2.5">Meetings</th>
                  <th className="px-3 py-2.5">Planned tasks</th>
                  <th className="px-3 py-2.5">Remaining</th>
                  <th className="w-1/3 px-5 py-2.5">Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.rows.map((r) => {
                  const cap = Math.max(r.capacityMins, r.meetingMins + r.plannedMins, 1);
                  const pct = (m: number) => `${(m / cap) * 100}%`;
                  const over = r.remainingMins < 0;
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        <Link to={`/my-week?user=${r.id}&week=${toDateInput(data.weekStart)}`} className="flex items-center gap-3 hover:underline">
                          <AP_Avatar name={r.name} src={r.avatarUrl} size={30} />
                          <span>
                            <span className="block font-medium text-slate-800">{r.name}</span>
                            <span className="block text-xs text-slate-500">{r.title}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{r.capacityMins ? formatDuration(r.capacityMins) : "—"}</td>
                      <td className="px-3 py-3 text-slate-700">{formatDuration(r.meetingMins)}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {formatDuration(r.plannedMins)}
                        {r.unestimated > 0 && <span className="block text-xs text-amber-600">+{r.unestimated} without estimate</span>}
                      </td>
                      <td className={cn("px-3 py-3 font-semibold", over ? "text-red-600" : "text-emerald-700")}>
                        {over ? `−${formatDuration(-r.remainingMins)}` : formatDuration(r.remainingMins)}
                      </td>
                      <td className="px-5 py-3">
                        <div className={cn("flex h-3 w-full overflow-hidden rounded-full bg-slate-100", over && "ring-2 ring-red-300")}>
                          <div className="bg-brand-700" style={{ width: pct(r.meetingMins) }} title={`Meetings ${formatDuration(r.meetingMins)}`} />
                          <div className="bg-accent-500" style={{ width: pct(r.doneMins) }} title={`Done ${formatDuration(r.doneMins)}`} />
                          <div className="bg-accent-400/50" style={{ width: pct(r.plannedMins - r.doneMins) }} title={`Open ${formatDuration(r.plannedMins - r.doneMins)}`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AP_Card>
      </AP_QueryState>
      <p className="mt-3 text-xs text-slate-500">
        Tasks count toward the week they are planned for, or the week they are due if no week is planned. Remaining time is a planning balance, not
        verified work performed.
      </p>
    </div>
  );
}
