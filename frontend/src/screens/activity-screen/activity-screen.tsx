import { useQuery } from "@tanstack/react-query";
import { GetActivity } from "@/Shared/SharedService";
import { AP_ActivityList } from "@/components/AP_ActivityList";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useLookups } from "@/hooks/useLookups";
import { AP_Card } from "@/components/AP_Card";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";

export default function ActivityScreen() {
  useDocumentTitle("Activity log");
  const [entity, setEntity] = useQueryParam("entity");
  const [user, setUser] = useQueryParam("user");
  const { users } = useLookups();
  const { data, isLoading, error } = useQuery({
    queryKey: ["activity", entity, user],
    queryFn: () => GetActivity({ entity, user }),
  });

  return (
    <div>
      <AP_PageHeader title="Activity log" description="Who changed what, most recent first (last 200 entries)." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <AP_Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-48" aria-label="Type">
          <option value="">All types</option>
          {data?.entities.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </AP_Select>
        <AP_Select value={user} onChange={(e) => setUser(e.target.value)} className="w-48" aria-label="Person">
          <option value="">Everyone</option>
          {users.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </AP_Select>
      </div>
      <AP_QueryState isLoading={isLoading} error={error}>
        <AP_Card>
          <AP_ActivityList items={data?.items ?? []} />
        </AP_Card>
      </AP_QueryState>
    </div>
  );
}
