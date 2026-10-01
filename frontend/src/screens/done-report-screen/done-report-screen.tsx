import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { AlarmClock, CircleCheck, Clock, Download, Printer, UsersRound } from "lucide-react";
import { GetCompletedReport } from "@/Shared/SharedService";
import type { CompletedReport } from "@/Shared/Types";
import { hours } from "@/Shared/SharedFunctions";
import { formatShortDate } from "@/Shared/format";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_DoneByPerson } from "@/components/AP_DoneByPerson";
import { AP_DoneByProject } from "@/components/AP_DoneByProject";
import { AP_DoneTaskTable } from "@/components/AP_DoneTaskTable";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_PeriodPicker, periodPresets, type Period } from "@/components/AP_PeriodPicker";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_SummaryTile } from "@/components/AP_SummaryTile";

/** Spreadsheet-friendly CSV of the report's tasks (opens in Excel). */
function downloadCsv(report: CompletedReport) {
  const header = ["Completed", "Task", "Kind", "Request", "Project", "Done by", "Due date", "On time", "Estimate (h)"];
  const rows = report.tasks.map((t) => [
    new Date(t.completedAt).toLocaleString("en-GB", { timeZone: report.timezone }),
    t.title,
    t.kind,
    t.request ? `#${t.request.number} ${t.request.title}` : "",
    t.request?.project.name ?? "",
    t.assignee?.name ?? "Unassigned",
    t.dueDate ? t.dueDate.slice(0, 10) : "",
    t.onTime === null ? "" : t.onTime ? "Yes" : "No",
    t.estimateMins != null ? hours(t.estimateMins) : "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `tasks-done_${report.from}_to_${report.to}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export default function DoneReportScreen() {
  useDocumentTitle("Done report");
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const thisWeek = periodPresets(me.timezone)[0]!;
  const period: Period = { from: params.get("from") ?? thisWeek.from, to: params.get("to") ?? thisWeek.to };
  const setPeriod = (p: Period) => setParams({ from: p.from, to: p.to }, { replace: true });

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "completed", period.from, period.to],
    queryFn: () => GetCompletedReport(period.from, period.to),
    placeholderData: (prev) => prev,
  });

  const onTimeShare = data && data.onTime + data.late ? Math.round((data.onTime / (data.onTime + data.late)) * 100) : null;

  return (
    <div className="space-y-6">
      <AP_PageHeader
        title="Done report"
        description={`Tasks completed by the team between ${formatShortDate(period.from)} and ${formatShortDate(period.to)} ${period.to.slice(0, 4)} (${me.timezone.split("/").pop()} time).`}
        actions={
          <div className="no-print flex gap-2">
            <AP_Button variant="secondary" onClick={() => data && downloadCsv(data)} disabled={!data?.total}>
              <Download className="size-4" /> Export to Excel
            </AP_Button>
            <AP_Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </AP_Button>
          </div>
        }
      />

      <div className="no-print">
        <AP_PeriodPicker zone={me.timezone} value={period} onChange={setPeriod} />
      </div>

      <AP_QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <AP_SummaryTile icon={<CircleCheck className="size-5" />} tone="green" label="Tasks done" value={data.total} />
              <AP_SummaryTile icon={<Clock className="size-5" />} label="Estimated hours delivered" value={`${hours(data.estimateMins)} h`} />
              <AP_SummaryTile
                icon={<AlarmClock className="size-5" />}
                tone={onTimeShare === null || onTimeShare >= 80 ? "green" : onTimeShare >= 50 ? "amber" : "red"}
                label="Finished on time"
                value={onTimeShare === null ? "—" : `${onTimeShare}%`}
                hint={data.late ? `${data.late} late` : data.onTime ? "none late" : "no due dates"}
              />
              <AP_SummaryTile icon={<UsersRound className="size-5" />} label="People who delivered" value={data.byPerson.filter((p) => p.person).length} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <AP_DoneByPerson rows={data.byPerson} total={data.total} />
              <AP_DoneByProject rows={data.byProject} total={data.total} />
            </div>

            <AP_Card>
              <AP_CardHeader title={`Completed tasks (${data.total})`} description="Newest first. Click a request to open it." />
              <AP_DoneTaskTable tasks={data.tasks} zone={data.timezone} />
            </AP_Card>
          </>
        )}
      </AP_QueryState>
    </div>
  );
}
