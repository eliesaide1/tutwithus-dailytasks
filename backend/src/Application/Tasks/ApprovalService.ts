// New requests need approval before they become real work.
//
//   Gabriel (Project Leader)  opens straight away — he is the top of the chain
//   Elie (CTO)                needs Gabriel, or may tick "bypass" when Gabriel is away
//   everyone else             needs Gabriel or Elie
//
// Expressed through flags on the user (canApproveRequests, skipsRequestApproval,
// canBypassApproval) rather than names, so the chain survives people changing roles.
//
// Nobody approves their own request. That is the whole point of the step, and it is also
// what decides Elie's case: he can approve, so the only approver left for him is Gabriel.
import { z } from "zod";
import { Request, User, type UserDoc } from "../../Model";
import { badRequest, forbidden } from "../Common/errors";
import { parse } from "../Common/validation";
import { logActivity, notify } from "../Common/activity";
import { mailRequestApproved, mailRequestRejected } from "../Common/mail";
import { findRequest } from "./TaskMappers";

const decisionInput = z.object({
  note: z.string().trim().max(500).optional(),
});

/** Who could approve this request: every approver except its author. */
export async function approversFor(authorId: string) {
  return User.find({ active: true, canApproveRequests: true, _id: { $ne: authorId } }).select("name email").lean();
}

/**
 * What happens when `user` creates a request. `bypass` is the checkbox offered to people
 * who may use it; it is ignored for anyone else rather than being an error, so a stale
 * form cannot grant someone an approval they are not entitled to.
 */
export function approvalOnCreate(user: UserDoc, bypass: boolean) {
  if (user.skipsRequestApproval) return { status: "APPROVED" as const, auto: true, bypassed: false };
  if (bypass && user.canBypassApproval) return { status: "APPROVED" as const, auto: true, bypassed: true };
  return { status: "PENDING" as const, auto: false, bypassed: false };
}

/** Approvers decide; the author cannot decide their own, whatever their role. */
async function loadForDecision(user: UserDoc, numberParam: string) {
  const r = await findRequest(numberParam);
  if (!user.canApproveRequests) throw forbidden("Only Gabriel or Elie can approve requests.");
  if (String(r.createdBy ?? "") === user.id) throw forbidden("You can't approve your own request — it needs the other approver.");
  if (r.approval.status !== "PENDING") throw badRequest("This request has already been decided.");
  return r;
}

export async function approve(user: UserDoc, numberParam: string) {
  const r = await loadForDecision(user, numberParam);
  r.approval.status = "APPROVED";
  r.approval.decidedBy = user.id as unknown as typeof r.approval.decidedBy;
  r.approval.decidedAt = new Date();
  await r.save();

  const link = `/tasks/${r.number}`;
  await logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "status", summary: `approved request #${r.number} "${r.title}"`, link });
  await notify({ user: r.createdBy, actor: user.id, title: `#${r.number} approved`, body: r.title, link });
  if (r.owner && String(r.owner) !== String(r.createdBy ?? "")) {
    await notify({ user: r.owner, actor: user.id, title: `You own #${r.number}`, body: r.title, link });
  }
  await mailRequestApproved({ request: r, approver: user, authorId: r.createdBy, ownerId: r.owner });
  return { ok: true };
}

/**
 * Rejecting keeps the request and its tasks — nothing is deleted — but it never becomes
 * work: it stays out of the tree, the workload and everyone's week.
 */
export async function reject(user: UserDoc, numberParam: string, input: unknown) {
  const r = await loadForDecision(user, numberParam);
  const { note } = parse(decisionInput, input);
  r.approval.status = "REJECTED";
  r.approval.decidedBy = user.id as unknown as typeof r.approval.decidedBy;
  r.approval.decidedAt = new Date();
  r.approval.note = note;
  r.status = "CANCELLED";
  r.closedAt = new Date();
  await r.save();

  const link = `/tasks/${r.number}`;
  await logActivity({
    actor: user.id,
    entity: "Request",
    entityId: r.number,
    action: "status",
    summary: `rejected request #${r.number} "${r.title}"${note ? ` — ${note}` : ""}`,
    link,
  });
  await notify({ user: r.createdBy, actor: user.id, title: `#${r.number} was not approved`, body: note || r.title, link });
  // The person who would have owned it hears the decision too — but only the decision.
  // Approval is what hands someone work; a rejection must never read like an assignment.
  if (r.owner && String(r.owner) !== String(r.createdBy ?? "")) {
    await notify({ user: r.owner, actor: user.id, title: `#${r.number} was not approved`, body: note || r.title, link });
  }
  await mailRequestRejected({ request: r, approver: user, authorId: r.createdBy, ownerId: r.owner, note });
  return { ok: true };
}

/** Requests waiting on this person, newest first. */
export async function listPending(user: UserDoc) {
  if (!user.canApproveRequests) return { requests: [] };
  const rows = await Request.find({ "approval.status": "PENDING", createdBy: { $ne: user.id } })
    .sort({ number: -1 })
    .populate("project", "code name color")
    .populate("createdBy", "name avatarUrl title")
    .lean();
  return { requests: rows };
}
