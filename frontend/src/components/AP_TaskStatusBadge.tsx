import { AP_Badge, type BadgeTone } from "./AP_Badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/Shared/constants";

const taskTone: Record<TaskStatus, BadgeTone> = {
  TODO: "slate",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
  DONE: "green",
};

export function AP_TaskStatusBadge({ status }: { status: string }) {
  const s = status as TaskStatus;
  return <AP_Badge tone={taskTone[s] ?? "slate"}>{TASK_STATUS_LABELS[s] ?? status}</AP_Badge>;
}
