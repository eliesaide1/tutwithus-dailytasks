import { AP_Badge, type BadgeTone } from "./AP_Badge";
import { PRIORITY_LABELS, type Priority } from "@/Shared/constants";

const priorityTone: Record<Priority, BadgeTone> = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
};

export function AP_PriorityBadge({ priority }: { priority: string }) {
  const p = priority as Priority;
  return <AP_Badge tone={priorityTone[p] ?? "slate"}>{PRIORITY_LABELS[p] ?? priority}</AP_Badge>;
}
