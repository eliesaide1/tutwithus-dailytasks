import { AP_Badge, type BadgeTone } from "./AP_Badge";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/Shared/constants";

const requestTone: Record<RequestStatus, BadgeTone> = {
  OPEN: "blue",
  IN_PROGRESS: "purple",
  WAITING_INFO: "amber",
  WAITING_PREREQ: "amber",
  DONE: "green",
  CANCELLED: "slate",
};

export function AP_RequestStatusBadge({ status }: { status: string }) {
  const s = status as RequestStatus;
  return <AP_Badge tone={requestTone[s] ?? "slate"}>{REQUEST_STATUS_LABELS[s] ?? status}</AP_Badge>;
}
