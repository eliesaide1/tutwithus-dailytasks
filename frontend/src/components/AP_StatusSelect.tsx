import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/Shared/constants";
import { cn } from "@/Shared/format";
import { SetRequestStatus, SetTaskStatus } from "@/Shared/SharedService";
import { useApiMutation } from "@/hooks/useApiMutation";
import { TASK_KEYS } from "@/hooks/useTasks";
import { AP_Select } from "./AP_Select";

const taskStatusColor: Record<string, string> = {
  TODO: "text-slate-700",
  IN_PROGRESS: "text-brand-700",
  BLOCKED: "text-red-700",
  DONE: "text-emerald-700",
};

/** AP_Select that saves a request or task status as soon as it changes. */
export function AP_StatusSelect({ kind, id, status, disabled }: { kind: "task" | "request"; id: string | number; status: string; disabled?: boolean }) {
  const values = kind === "task" ? TASK_STATUSES : REQUEST_STATUSES;
  const labels: Record<string, string> = kind === "task" ? TASK_STATUS_LABELS : REQUEST_STATUS_LABELS;
  const save = useApiMutation(
    (next: string) => (kind === "task" ? SetTaskStatus(String(id), next) : SetRequestStatus(id, next)),
    { invalidate: [...TASK_KEYS] },
  );
  return (
    <span className="inline-flex flex-col items-end">
      <AP_Select
        value={save.isPending && save.variables ? save.variables : status}
        disabled={disabled || save.isPending}
        aria-label="Status"
        onChange={(e) => save.mutate(e.target.value)}
        className={cn("w-auto py-1 text-xs font-medium", taskStatusColor[status])}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {labels[v]}
          </option>
        ))}
      </AP_Select>
    </span>
  );
}
