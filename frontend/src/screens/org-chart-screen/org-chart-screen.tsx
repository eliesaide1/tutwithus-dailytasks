import { useQuery } from "@tanstack/react-query";
import { GetOrgChart } from "@/Shared/SharedService";
import { peopleKeys } from "@/hooks/usePeople";
import { AP_OrgChart } from "@/components/AP_OrgChart";
import { AP_DirectoryTabs } from "@/components/AP_DirectoryTabs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";

export default function OrgChartScreen() {
  useDocumentTitle("Org chart");
  const q = useQuery({
    queryKey: peopleKeys.orgChart,
    queryFn: GetOrgChart,
  });

  return (
    <>
      <AP_PageHeader
        title="Org Chart"
        count={q.data?.people.length}
        description="Who reports to whom across TutWithUs. Click a card to open the profile."
      />
      <AP_DirectoryTabs active="chart" />
      <AP_QueryState isLoading={q.isLoading} error={q.error}>
        {q.data && <AP_OrgChart people={q.data.people} departments={q.data.departments} initialDepth="all" />}
      </AP_QueryState>
    </>
  );
}
