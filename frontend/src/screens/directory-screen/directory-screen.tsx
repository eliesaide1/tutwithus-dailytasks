import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Search } from "lucide-react";
import { cn } from "@/Shared/format";
import { formatMinute, utcToZoned, zoneLabel } from "@/Shared/time";
import { GetDirectory } from "@/Shared/SharedService";
import { peopleKeys } from "@/hooks/usePeople";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Card } from "@/components/AP_Card";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_Input } from "@/components/AP_Input";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";
import { AP_DirectoryTabs } from "@/components/AP_DirectoryTabs";
import { AP_DirectoryCard, type DirectoryEntry } from "@/components/AP_DirectoryCard";
import { AP_DirectoryTable } from "@/components/AP_DirectoryTable";
import { useDeptCodes } from "@/hooks/useDeptCodes";

export default function DirectoryScreen() {
  useDocumentTitle("Directory");
  const me = useMe();
  const q = useQuery({
    queryKey: peopleKeys.directory,
    queryFn: GetDirectory,
  });

  // Local times are computed when the data loads (refreshed with the query).
  const people = useMemo<DirectoryEntry[]>(() => {
    const now = new Date();
    return (q.data?.people ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      title: u.title,
      email: u.email,
      phone: u.phone ?? null,
      whatsapp: u.whatsapp ?? null,
      avatarUrl: u.avatarUrl ?? null,
      departmentId: u.department?.id ?? null,
      departmentName: u.department?.name ?? null,
      departmentColor: u.department?.color ?? null,
      managerId: u.manager?.id ?? null,
      managerName: u.manager?.name ?? null,
      zone: zoneLabel(u.timezone, now),
      localTime: formatMinute(utcToZoned(now, u.timezone).minute),
    }));
  }, [q.data]);

  return (
    <>
      <AP_PageHeader
        title="Directory"
        count={q.data?.people.length}
        description="Contact details and local time for everyone on the team."
        actions={me.permissions.isAdmin ? <AP_LinkButton to="/admin/users/new">Add person</AP_LinkButton> : undefined}
      />
      <AP_DirectoryTabs active="directory" />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        <Directory people={people} departments={q.data?.departments ?? []} />
      </AP_QueryState>
    </>
  );
}

function Directory({ people, departments }: { people: DirectoryEntry[]; departments: { id: string; name: string }[] }) {
  const { labelOf } = useDeptCodes();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return people.filter(
      (p) =>
        (!dept || (dept === "none" ? !p.departmentId : p.departmentId === dept)) &&
        (!term ||
          [p.name, p.title, p.email, p.departmentName ?? ""].some((v) => v.toLowerCase().includes(term))),
    );
  }, [people, q, dept]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <AP_Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, title, email…" className="pl-9" aria-label="Search people" />
        </div>
        <AP_Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-auto" aria-label="Filter by team">
          <option value="">All teams</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {labelOf(d.name, d.id)}
            </option>
          ))}
          <option value="none">No team</option>
        </AP_Select>
        <div className="ml-auto flex rounded-lg border border-slate-300 bg-white p-0.5">
          {(["cards", "table"] as const).map((v) => {
            const Icon = v === "cards" ? LayoutGrid : List;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-label={v === "cards" ? "Card view" : "Table view"}
                aria-pressed={view === v}
                className={cn("rounded-md p-1.5", view === v ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-slate-800")}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <AP_Card>
          <AP_EmptyState title="No one matches" description="Try a different name or team." />
        </AP_Card>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <AP_DirectoryCard key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <AP_DirectoryTable people={filtered} />
      )}
    </div>
  );
}
