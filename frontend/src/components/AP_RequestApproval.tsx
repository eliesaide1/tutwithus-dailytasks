import { useState } from "react";
import { Check, Clock, ShieldCheck, X } from "lucide-react";
import type { RequestApproval } from "@/Shared/Types";
import { ApproveRequest, RejectRequest } from "@/Shared/SharedService";
import { useApiMutation } from "@/hooks/useApiMutation";
import { TASK_KEYS } from "@/hooks/useTasks";
import { AP_Button } from "./AP_Button";
import { AP_Input } from "./AP_Input";

/**
 * The approval banner on a request that has not been approved yet.
 *
 * Renders nothing once a request is approved in the normal way — only a bypassed one
 * keeps a marker, so it stays visible that it opened without review.
 */
export function AP_RequestApproval({ number, approval }: { number: number; approval: RequestApproval }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const invalidate = [...TASK_KEYS];
  const approve = useApiMutation(() => ApproveRequest(number), { invalidate });
  const reject = useApiMutation((reason: string) => RejectRequest(number, reason), {
    invalidate,
    onSuccess: () => setRejecting(false),
  });
  const busy = approve.isPending || reject.isPending;

  if (approval.status === "APPROVED") {
    if (!approval.bypassed) return null;
    return (
      <p className="mt-1 ml-6 inline-flex items-center gap-1 text-xs text-amber-700">
        <ShieldCheck className="size-3.5" /> Opened without approval (bypass)
      </p>
    );
  }

  if (approval.status === "REJECTED") {
    return (
      <p className="mt-1 ml-6 inline-flex items-center gap-1 text-xs text-red-600">
        <X className="size-3.5" /> Not approved{approval.note ? ` — ${approval.note}` : ""}
      </p>
    );
  }

  return (
    <div className="mt-2 ml-6 rounded-lg border border-amber-300 bg-amber-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="size-4 shrink-0 text-amber-600" />
        <span className="text-sm font-semibold text-amber-900">Waiting for approval</span>
        <span className="text-xs text-amber-800">
          {approval.canDecide ? "No work starts until you approve it." : "It becomes work once an approver accepts it."}
        </span>

        {approval.canDecide && !rejecting && (
          <span className="ml-auto flex gap-2">
            <AP_Button type="button" size="sm" disabled={busy} onClick={() => approve.mutate(undefined)}>
              <Check className="size-3.5" /> Approve
            </AP_Button>
            <AP_Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
              Reject
            </AP_Button>
          </span>
        )}
      </div>

      {approval.canDecide && rejecting && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            reject.mutate(note.trim());
          }}
        >
          <AP_Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Why not? (optional, the author sees this)"
            className="min-w-56 flex-1"
          />
          <AP_Button type="submit" size="sm" variant="danger" disabled={busy}>
            Confirm reject
          </AP_Button>
          <AP_Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
            Keep it
          </AP_Button>
        </form>
      )}
    </div>
  );
}
