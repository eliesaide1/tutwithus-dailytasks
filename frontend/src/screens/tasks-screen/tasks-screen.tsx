import { useSearchParams } from "react-router";
import type { ReactNode } from "react";
import { Briefcase, CircleDot, Hourglass, Plus, Workflow } from "lucide-react";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, type RequestStatus } from "@/Shared/constants";
import type { TreeRequest } from "@/Shared/Types";
import { useTaskTree } from "@/hooks/useTasks";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLookups } from "@/hooks/useLookups";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Card } from "@/components/AP_Card";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_LinkButton } from "@/components/AP_LinkButton";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Select } from "@/components/AP_Select";
import { AP_RequestTreeNode } from "@/components/AP_RequestTreeNode";
import { AP_TaskLegend } from "@/components/AP_TaskLegend";
import { AP_TreeToggle } from "@/components/AP_TreeToggle";

type View = "project" | "person" | "status";
type Group = { key: string; label: string; code?: string; color?: string; avatar?: { name: string; src: string | null }; requests: TreeRequest[] };

export default function TasksScreen() {
  useDocumentTitle("Tasks");
  const user = useMe();
  const { users } = useLookups();
  const [params, setParams] = useSearchParams();
  const viewParam = params.get("view");
  const view: View = viewParam === "person" || viewParam === "status" ? viewParam : "project";
  const seeAll = user.permissions.canSeeAllTasks;
  const person = seeAll ? (params.get("person") ?? "all") : "me";
  const show = params.get("show") ?? "open";
  const project = params.get("project") ?? "";

  const tree = useTaskTree({ person, show, project });

  const set = (patch: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      return next;
    });

  // Only what still has to be done: done tasks and done requests are never listed here
  // (finished work is in Admin → Done report).
  const requests = (tree.data?.requests ?? [])
    .filter((r) => r.status !== "DONE")
    .map((r) => ({ ...r, tasks: r.tasks.filter((t) => t.status !== "DONE"), doneHidden: r.tasks.filter((t) => t.status === "DONE").length }));
  // Waiting requests get their own nodes and are left out of the total.
  const waitingPrereq = requests.filter((r) => r.status === "WAITING_PREREQ");
  const waitingInfo = requests.filter((r) => r.status === "WAITING_INFO");
  const active = requests.filter((r) => r.status !== "WAITING_PREREQ" && r.status !== "WAITING_INFO");
  const taskCount = (list: TreeRequest[]) => list.reduce((n, r) => n + r.tasks.length, 0);
  const now = new Date();
  const projectName = project ? requests.find((r) => r.project.id === project)?.project.name : null;

  return (
    <div>
      <AP_PageHeader
        title="Tasks"
        description={
          seeAll
            ? "Every request and task across the company. Filter by person to see exactly what each one is working on."
            : "Your tasks, plus the requests you own. Update a task's status from the request page or My week."
        }
        actions={
          user.permissions.canManageTasks && (
            <AP_LinkButton to={project ? `/tasks/new?project=${project}` : "/tasks/new"}>
              <Plus className="size-4" /> New request
            </AP_LinkButton>
          )
        }
      />

      <AP_Card className="mb-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-500">View by</span>
            <AP_Select value={view} onChange={(e) => set({ view: e.target.value === "project" ? "" : e.target.value })} className="w-auto py-1.5">
              <option value="project">Project</option>
              <option value="person">Person</option>
              <option value="status">Status</option>
            </AP_Select>
          </label>
          {seeAll && (
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Person</span>
            <AP_Select value={person} onChange={(e) => set({ person: e.target.value === "all" ? "" : e.target.value })} className="w-auto py-1.5">
              <option value="all">Everyone</option>
              <option value="me">Me ({user.name})</option>
              {users.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </AP_Select>
          </label>
          )}
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Show</span>
            <AP_Select value={show} onChange={(e) => set({ show: e.target.value === "open" ? "" : e.target.value })} className="w-auto py-1.5">
              <option value="open">Open requests</option>
              <option value="all">All (except done)</option>
              {REQUEST_STATUSES.filter((s) => s !== "DONE").map((s) => (
                <option key={s} value={s}>
                  Only: {REQUEST_STATUS_LABELS[s]}
                </option>
              ))}
            </AP_Select>
          </label>
          {project && (
            <span className="flex items-center gap-2">
              <span className="text-slate-500">Project: {projectName ?? "one project only"}</span>
              <button type="button" onClick={() => set({ project: "" })} className="text-brand-700 hover:underline">
                Clear
              </button>
            </span>
          )}
          <div className="ml-auto">
            <AP_TreeToggle targetId="task-tree" />
          </div>
        </div>
      </AP_Card>

      {/* Icon key: beside the tree on wide screens, a compact row above it otherwise. */}
      <AP_TaskLegend inline className="mb-3 xl:hidden" />
      <div className="flex items-start gap-5">
        <AP_Card className="min-w-0 flex-1 p-4 sm:p-5">
          <AP_QueryState isLoading={tree.isLoading} error={tree.error}>
            <div id="task-tree" className="text-sm">
              {waitingPrereq.length > 0 && (
                <TreeNode
                  icon={<Workflow className="size-4 text-amber-600" />}
                  label={
                    <>
                      [{waitingPrereq.length}] Waiting prerequisite <Counts requests={waitingPrereq.length} tasks={taskCount(waitingPrereq)} />
                    </>
                  }
                >
                  <GroupTree requests={waitingPrereq} view={view} now={now} />
                </TreeNode>
              )}
              {waitingInfo.length > 0 && (
                <TreeNode
                  icon={<Hourglass className="size-4 text-amber-600" />}
                  label={
                    <>
                      [{waitingInfo.length}] Waiting info <Counts requests={waitingInfo.length} tasks={taskCount(waitingInfo)} />
                    </>
                  }
                >
                  <GroupTree requests={waitingInfo} view={view} now={now} />
                </TreeNode>
              )}
              <TreeNode
                open
                icon={<Briefcase className="size-4 text-brand-700" />}
                label={
                  <>
                    A total of [{active.length}] request(s) [{taskCount(active)}] task(s)
                  </>
                }
              >
                {active.length === 0 ? (
                  <AP_EmptyState title="Nothing here" description="No requests match these filters." />
                ) : (
                  <GroupTree requests={active} view={view} now={now} />
                )}
              </TreeNode>
            </div>
          </AP_QueryState>
        </AP_Card>
        <AP_TaskLegend className="sticky top-20 hidden w-56 shrink-0 xl:block" />
      </div>
    </div>
  );
}

/** One top-level node of the tree (waiting prerequisite, waiting info, total). */
function TreeNode({ icon, label, open = false, children }: { icon: ReactNode; label: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="mb-1">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-0.5 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        {icon}
        {label}
      </summary>
      {children}
    </details>
  );
}

function Counts({ requests, tasks }: { requests: number; tasks: number }) {
  return (
    <span className="font-normal text-slate-500">
      – [{requests}] request(s) [{tasks}] task(s)
    </span>
  );
}

/** Requests grouped by project / person / status, each request expandable to its tasks. */
function GroupTree({ requests, view, now }: { requests: (TreeRequest & { doneHidden?: number })[]; view: View; now: Date }) {
  return (
    <ul className="mt-1 ml-2 border-l border-dotted border-slate-300 pl-4">
      {groupRequests(requests, view).map((g) => (
        <li key={g.key} className="py-0.5">
          <details open>
            <summary className="flex cursor-pointer list-none items-center gap-2 py-0.5 font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
              {g.avatar ? (
                <AP_Avatar name={g.avatar.name} src={g.avatar.src} size={20} />
              ) : view === "status" ? (
                <CircleDot className="size-4 text-slate-500" />
              ) : (
                <span className="size-3 rounded-sm" style={{ background: g.color ?? "#0b3b8c" }} />
              )}
              {g.label}
              {g.code && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide text-slate-600 ring-1 ring-slate-200 ring-inset">
                  {g.code}
                </span>
              )}
              <span className="font-normal text-slate-500">[{g.requests.length}] request(s)</span>
            </summary>
            <ul className="ml-2 border-l border-dotted border-slate-300 pl-4">
              {g.requests.map((r) => (
                <AP_RequestTreeNode key={`${g.key}-${r.id}`} r={r} now={now} showProject={view !== "project"} doneHidden={(r as { doneHidden?: number }).doneHidden ?? 0} />
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}

function groupRequests(requests: TreeRequest[], view: View): Group[] {
  const map = new Map<string, Group>();
  const add = (key: string, init: () => Omit<Group, "requests">, r: TreeRequest) => {
    if (!map.has(key)) map.set(key, { ...init(), requests: [] });
    map.get(key)!.requests.push(r);
  };

  for (const r of requests) {
    if (view === "project") {
      add(r.project.id, () => ({ key: r.project.id, label: r.project.name, code: r.project.code, color: r.project.color }), r);
    } else if (view === "status") {
      add(r.status, () => ({ key: r.status, label: REQUEST_STATUS_LABELS[r.status as RequestStatus] ?? r.status }), r);
    } else {
      // By person: a request appears under each assignee, with only their tasks.
      const byAssignee = new Map<string, TreeRequest["tasks"]>();
      for (const t of r.tasks) {
        const k = t.assignee?.id ?? "unassigned";
        byAssignee.set(k, [...(byAssignee.get(k) ?? []), t]);
      }
      if (byAssignee.size === 0) byAssignee.set(r.owner?.id ?? "unassigned", []);
      for (const [k, tasks] of byAssignee) {
        const p = tasks[0]?.assignee ?? (k === r.owner?.id ? r.owner : null);
        add(k, () => (p ? { key: k, label: p.name, avatar: { name: p.name, src: p.avatarUrl } } : { key: k, label: "Unassigned" }), { ...r, tasks });
      }
    }
  }

  const groups = [...map.values()];
  if (view === "status") {
    const order = REQUEST_STATUSES as readonly string[];
    return groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }
  return groups.sort((a, b) => (a.key === "unassigned" ? 1 : b.key === "unassigned" ? -1 : a.label.localeCompare(b.label)));
}
