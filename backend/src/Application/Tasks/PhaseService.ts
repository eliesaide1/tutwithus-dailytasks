// The three-phase workflow a request moves through.
//
//   Acceptance -> Planning -> Delivery
//
// The names describe what each step decides, not who does the work, so the same workflow
// reads sensibly in every department: preparation/execution is analysis/development in
// Development, research/production in Marketing, qualifying/pitching in Sales.
//
// Each phase is activated first, then filled in, then closed with an action. A phase
// cannot be touched until the one before it is done, so the order is enforced here
// rather than trusted from the client.
//
// The one shortcut: a request accepted as Support finishes at acceptance — it is handled
// with the client directly by email, so there is nothing to analyse or build.
import { z } from "zod";
import { Request, type UserDoc } from "../../Model";
import { badRequest, forbidden } from "../Common/errors";
import { parse } from "../Common/validation";
import { canManageTasks } from "../Common/permissions";
import { logActivity } from "../Common/activity";
import { zDate } from "../Common/validation";
import { findRequest } from "./TaskMappers";

export const PHASES = ["acceptance", "analysis", "development"] as const;
export type PhaseName = (typeof PHASES)[number];

export const ACCEPT_AS = ["NEW_REQUEST", "ISSUE", "SUPPORT"] as const;
export const REQUEST_TYPES_PHASE = ["IMPROVEMENT", "SUPPORT", "FIX", "CONTENT", "OTHER"] as const;

const PHASE_LABELS: Record<PhaseName, string> = {
  acceptance: "Acceptance",
  analysis: "Planning",
  development: "Delivery",
};

const acceptanceInput = z.object({
  acceptAs: z.enum(ACCEPT_AS).nullable().optional(),
  requestType: z.enum(REQUEST_TYPES_PHASE).nullable().optional(),
});

const analysisInput = z.object({
  deliveryDate: zDate,
  // Preparation and execution, in hours. The UI shows the day equivalent at 8 h/day.
  analysisHours: z.coerce.number().min(0).max(2000).nullable().optional(),
  developmentHours: z.coerce.number().min(0).max(2000).nullable().optional(),
});

/** Admins own the workflow, same as every other change to a request. */
function assertCanRun(user: UserDoc) {
  if (!canManageTasks(user)) throw forbidden("Only Charbel, Elie and Gabriel can move a request through its phases.");
}

type Phases = {
  acceptance: { activated: boolean; status: string; acceptAs: string | null };
  analysis: { activated: boolean; status: string };
  development: { activated: boolean; status: string };
};

/**
 * A phase is reachable only once the previous one is done. Support stops after
 * acceptance, so nothing downstream ever opens for it.
 */
export function isPhaseOpen(phases: Phases, phase: PhaseName) {
  if (phase === "acceptance") return true;
  const accepted = phases.acceptance.status === "ACCEPTED";
  if (!accepted || phases.acceptance.acceptAs === "SUPPORT") return false;
  if (phase === "analysis") return true;
  return phases.analysis.status === "FINALIZED";
}

async function load(user: UserDoc, numberParam: string, phase: PhaseName) {
  assertCanRun(user);
  const r = await findRequest(numberParam);
  if (!PHASES.includes(phase)) throw badRequest("Unknown phase.");
  if (!isPhaseOpen(r.phases as unknown as Phases, phase)) {
    throw badRequest(`${PHASE_LABELS[phase]} isn't open yet — finish the phase before it first.`);
  }
  return r;
}

const note = (r: { number: number }, summary: string, user: UserDoc) =>
  logActivity({ actor: user.id, entity: "Request", entityId: r.number, action: "updated", summary, link: `/tasks/${r.number}` });

/** Opens a phase for editing. Until then its fields and buttons stay disabled. */
export async function activate(user: UserDoc, numberParam: string, phase: PhaseName) {
  const r = await load(user, numberParam, phase);
  r.phases[phase].activated = true;
  await r.save();
  await note(r, `activated ${PHASE_LABELS[phase]} on #${r.number}`, user);
  return { ok: true };
}

/** Saves the fields of a phase. Does not close it — that is what the actions do. */
export async function update(user: UserDoc, numberParam: string, phase: PhaseName, input: unknown) {
  const r = await load(user, numberParam, phase);
  if (!r.phases[phase].activated) throw badRequest(`Activate ${PHASE_LABELS[phase]} before editing it.`);

  if (phase === "acceptance") {
    const body = parse(acceptanceInput, input);
    if (body.acceptAs !== undefined) r.phases.acceptance.acceptAs = body.acceptAs;
    if (body.requestType !== undefined) r.phases.acceptance.requestType = body.requestType;
  } else if (phase === "analysis") {
    const body = parse(analysisInput, input);
    r.phases.analysis.deliveryDate = body.deliveryDate ?? undefined;
    r.phases.analysis.analysisHours = body.analysisHours ?? undefined;
    r.phases.analysis.developmentHours = body.developmentHours ?? undefined;
  } else {
    throw badRequest("Solution development has no fields to edit.");
  }
  await r.save();
  return { ok: true };
}

/**
 * Closes a phase. Which actions are allowed depends on the phase:
 *   acceptance   accept | cancel
 *   analysis     finalize | cancel
 *   development  review | finalize | cancel
 */
export async function act(user: UserDoc, numberParam: string, phase: PhaseName, action: string) {
  const r = await load(user, numberParam, phase);
  const p = r.phases[phase];
  if (!p.activated) throw badRequest(`Activate ${PHASE_LABELS[phase]} first.`);

  const stamp = () => {
    p.actedBy = user.id as unknown as typeof p.actedBy;
    p.actedAt = new Date();
  };

  // Cancel backs out of the phase — it closes the editor and leaves the request alone.
  // Rejecting a request outright is a separate decision, made with the request's own
  // status control, so a misclick here can never take a live request off the board.
  if (action === "cancel") {
    p.activated = false;
    p.status = "PENDING";
    p.actedBy = null;
    p.actedAt = undefined;
    await r.save();
    await note(r, `closed ${PHASE_LABELS[phase]} on #${r.number} without ${phase === "acceptance" ? "accepting" : "finalizing"}`, user);
    return { ok: true };
  }

  if (phase === "acceptance") {
    if (action !== "accept") throw badRequest("Acceptance can only be accepted or cancelled.");
    const { acceptAs, requestType } = r.phases.acceptance;
    if (!acceptAs || !requestType) throw badRequest("Choose what to accept this as, and its type, before accepting.");
    r.phases.acceptance.status = "ACCEPTED";
    stamp();
    if (acceptAs === "SUPPORT") {
      // Handled with the client by email; there is nothing to analyse or build.
      r.status = "DONE";
      r.closedAt = new Date();
      await r.save();
      await note(r, `accepted #${r.number} as support — closed at client level`, user);
      return { ok: true, closed: true };
    }
    r.status = "IN_PROGRESS";
    await r.save();
    await note(r, `accepted #${r.number} as ${acceptAs === "ISSUE" ? "an issue" : "a new request"} (${requestType.toLowerCase()})`, user);
    return { ok: true };
  }

  if (phase === "analysis") {
    if (action !== "finalize") throw badRequest("Planning can only be finalized or cancelled.");
    const a = r.phases.analysis;
    if (!a.deliveryDate) throw badRequest("Set the delivery date before finalizing.");
    if (a.analysisHours == null || a.developmentHours == null) throw badRequest("Set the preparation and execution hours before finalizing.");
    a.status = "FINALIZED";
    stamp();
    if (!r.dueDate) r.dueDate = a.deliveryDate;
    await r.save();
    await note(r, `finalized the analysis of #${r.number} — delivery ${a.deliveryDate.toISOString().slice(0, 10)}`, user);
    return { ok: true };
  }

  // development
  if (action === "review") {
    r.phases.development.status = "REVIEW";
    r.phases.development.reviewAt = new Date();
    await r.save();
    await note(r, `sent #${r.number} for review`, user);
    return { ok: true };
  }
  if (action !== "finalize") throw badRequest("Delivery can be sent for review, finalized or cancelled.");
  r.phases.development.status = "FINALIZED";
  stamp();
  r.status = "DONE";
  r.closedAt = new Date();
  await r.save();
  await note(r, `finalized #${r.number} — delivered`, user);
  return { ok: true, closed: true };
}
