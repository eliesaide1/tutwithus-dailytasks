import { Link, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { formatMinute } from "@/Shared/time";
import { useAvailability } from "@/hooks/useSchedule";
import { AP_AvailabilityEditor } from "@/components/AP_AvailabilityEditor";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Card } from "@/components/AP_Card";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";

export default function AvailabilityScreen() {
  const me = useMe();
  const manager = me.permissions.isManager;
  const [params, setParams] = useSearchParams();
  // Members can only edit their own windows.
  const targetId = manager ? (params.get("user") ?? me.id) : me.id;
  const { data, isLoading, error } = useAvailability(targetId);
  const own = targetId === me.id;
  useDocumentTitle(own ? "My availability" : "Edit availability");

  return (
    <>
      <Link to="/schedule?tab=availability" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Back to schedule
      </Link>
      <AP_QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <AP_PageHeader
              title={own ? "My availability" : `${data.user.name}'s availability`}
              description="Weekly contact windows. Colleagues use these to plan meetings and urgent contact."
              actions={
                manager && (
                  <AP_Select
                    value={targetId}
                    onChange={(e) => setParams({ user: e.target.value })}
                    className="w-auto py-1.5"
                    aria-label="Person"
                  >
                    {data.team.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </AP_Select>
                )
              }
            />

            <AP_Card className="mb-4 flex items-center gap-3 p-4">
              <AP_Avatar name={data.user.name} src={data.user.avatarUrl} size={40} />
              <div className="text-sm">
                <p className="font-semibold text-slate-800">{data.user.name}</p>
                <p className="text-slate-500">
                  All times are in <strong>{data.zoneLabel}</strong> ({data.user.timezone}), {own ? "your" : "their"} own time zone. Others see
                  them converted automatically.
                </p>
              </div>
            </AP_Card>

            <AP_AvailabilityEditor
              key={data.user.id}
              userId={data.user.id}
              initial={data.windows.map((a) => ({
                dayOfWeek: a.dayOfWeek,
                kind: a.kind,
                start: formatMinute(a.startMinute),
                end: formatMinute(a.endMinute),
                note: a.note ?? "",
              }))}
            />
          </>
        )}
      </AP_QueryState>
    </>
  );
}
