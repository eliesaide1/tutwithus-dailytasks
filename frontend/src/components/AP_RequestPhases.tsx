import { useState, type ReactNode } from "react";
import { Check, Lock, Pencil } from "lucide-react";
import type { AcceptAs, PhaseAction as PhaseActionName, PhaseName, PhaseRequestType, RequestPhases } from "@/Shared/Types";
import { ActivatePhase, PhaseAction, UpdatePhase } from "@/Shared/SharedService";
import { cn, formatShortDate, toDateInput } from "@/Shared/format";
import { useApiMutation } from "@/hooks/useApiMutation";
import { TASK_KEYS } from "@/hooks/useTasks";
import { AP_Button } from "./AP_Button";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_Select } from "./AP_Select";

const ACCEPT_AS: { value: AcceptAs; label: string }[] = [
  { value: "NEW_REQUEST", label: "New request" },
  { value: "BUG", label: "Bug" },
  { value: "SUPPORT", label: "Support" },
];

const TYPES: { value: PhaseRequestType; label: string }[] = [
  { value: "ENHANCEMENT", label: "Enhancement" },
  { value: "SUPPORT", label: "Support" },
  { value: "FIX", label: "Fix" },
  { value: "CONTENT", label: "Content" },
  { value: "OTHER", label: "Other" },
];

/** 8 h is one working day, so 20 h reads as "2.5 d". */
const inDays = (hours: number | null) => (hours == null ? null : `${Math.round((hours / 8) * 10) / 10} d`);

const today = new Date();

function PhaseShell({
  title,
  step,
  open,
  activated,
  done,
  cancelled,
  onActivate,
  busy,
  children,
}: {
  title: string;
  step: number;
  open: boolean;
  activated: boolean;
  done: boolean;
  cancelled: boolean;
  onActivate: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-3", open ? "border-slate-200 bg-white" : "border-slate-150 bg-slate-50/60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            done ? "bg-emerald-600 text-white" : open ? "bg-brand-700 text-white" : "bg-slate-300 text-white",
          )}
        >
          {done ? <Check className="size-3" /> : step}
        </span>
        <span className={cn("text-sm font-semibold", open ? "text-slate-900" : "text-slate-400")}>{title}</span>

        {/* Activated shows a red check, as asked: it marks the phase as live, not finished. */}
        {activated && !done && !cancelled && <Check className="size-4 text-red-600" aria-label="Activated" />}
        {done && <span className="text-xs font-medium text-emerald-700">Done</span>}
        {cancelled && <span className="text-xs font-medium text-red-600">Cancelled</span>}

        {!open && <Lock className="size-3.5 text-slate-400" aria-label="Locked" />}

        <span className="ml-auto flex items-center gap-2">
          {open && !activated && !done && !cancelled && (
            <AP_Button type="button" size="sm" onClick={onActivate} disabled={busy}>
              Activate
            </AP_Button>
          )}
          {open && activated && !done && !cancelled && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Pencil className="size-3" /> Editing
            </span>
          )}
        </span>
      </div>
      {open && <div className="mt-3">{children}</div>}
      {!open && <p className="mt-1 ml-7 text-xs text-slate-400">Finish the phase before this one first.</p>}
    </div>
  );
}

/**
 * The three phases a request moves through, shown under it in the tree.
 * Each is activated, filled in, then closed with an action.
 */
export function AP_RequestPhases({ number, phases, canManage }: { number: number; phases: RequestPhases; canManage: boolean }) {
  const [acceptAs, setAcceptAs] = useState<string>(phases.acceptance.acceptAs ?? "");
  const [reqType, setReqType] = useState<string>(phases.acceptance.requestType ?? "");
  const [delivery, setDelivery] = useState(toDateInput(phases.analysis.deliveryDate));
  const [analysisH, setAnalysisH] = useState(phases.analysis.analysisHours?.toString() ?? "");
  const [devH, setDevH] = useState(phases.analysis.developmentHours?.toString() ?? "");

  const invalidate = [...TASK_KEYS];
  const activate = useApiMutation((p: PhaseName) => ActivatePhase(number, p), { invalidate });
  const save = useApiMutation(({ phase, body }: { phase: PhaseName; body: Record<string, unknown> }) => UpdatePhase(number, phase, body), { invalidate });
  const run = useApiMutation(({ phase, action }: { phase: PhaseName; action: PhaseActionName }) => PhaseAction(number, phase, action), { invalidate });
  const busy = activate.isPending || save.isPending || run.isPending;

  const a = phases.acceptance;
  const an = phases.analysis;
  const d = phases.development;

  // Acceptance needs both dropdowns before Accept is allowed.
  const canAccept = a.activated && !!acceptAs && !!reqType;
  const canFinalizeAnalysis = an.activated && !!delivery && analysisH !== "" && devH !== "";

  if (!canManage) return null;

  return (
    <div className="mt-2 ml-6 space-y-2">
      {/* 1 — Acceptance */}
      <PhaseShell
        title="Acceptance"
        step={1}
        open={a.open}
        activated={a.activated}
        done={a.status === "ACCEPTED"}
        cancelled={a.status === "CANCELLED"}
        onActivate={() => activate.mutate("acceptance")}
        busy={busy}
      >
        {a.status === "ACCEPTED" ? (
          <p className="text-xs text-slate-600">
            Accepted as <strong>{ACCEPT_AS.find((x) => x.value === a.acceptAs)?.label}</strong> · type{" "}
            <strong>{TYPES.find((x) => x.value === a.requestType)?.label}</strong>
            {a.acceptAs === "SUPPORT" && " — closed at client level, handled by email."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <AP_Field label="Accept this as">
                <AP_Select value={acceptAs} disabled={!a.activated} onChange={(e) => setAcceptAs(e.target.value)}>
                  <option value="">Choose…</option>
                  {ACCEPT_AS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </AP_Select>
              </AP_Field>
              <AP_Field label="Type">
                <AP_Select value={reqType} disabled={!a.activated} onChange={(e) => setReqType(e.target.value)}>
                  <option value="">Choose…</option>
                  {TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </AP_Select>
              </AP_Field>
            </div>
            {acceptAs === "SUPPORT" && (
              <p className="mt-2 text-xs text-amber-700">Accepting as support closes the request — it is handled with the client by email.</p>
            )}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <AP_Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!a.activated || busy}
                onClick={() => save.mutate({ phase: "acceptance", body: { acceptAs: acceptAs || null, requestType: reqType || null } })}
              >
                Apply
              </AP_Button>
              <AP_Button type="button" size="sm" disabled={!canAccept || busy} onClick={() => run.mutate({ phase: "acceptance", action: "accept" })}>
                Accept
              </AP_Button>
              <AP_Button
                type="button"
                size="sm"
                variant="danger"
                disabled={!a.activated || busy}
                onClick={() => confirm(`Cancel request #${number}?`) && run.mutate({ phase: "acceptance", action: "cancel" })}
              >
                Cancel
              </AP_Button>
            </div>
          </>
        )}
      </PhaseShell>

      {/* 2 — Development analysis */}
      <PhaseShell
        title="Development analysis"
        step={2}
        open={an.open}
        activated={an.activated}
        done={an.status === "FINALIZED"}
        cancelled={an.status === "CANCELLED"}
        onActivate={() => activate.mutate("analysis")}
        busy={busy}
      >
        {an.status === "FINALIZED" ? (
          <p className="text-xs text-slate-600">
            Delivery <strong>{an.deliveryDate ? formatShortDate(an.deliveryDate) : "—"}</strong> · analysis <strong>{an.analysisHours} h</strong> ({inDays(an.analysisHours)}) ·
            development <strong>{an.developmentHours} h</strong> ({inDays(an.developmentHours)})
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <AP_Field label="Opened">
                {/* Today, fixed: the day the analysis is being done. */}
                <AP_Input type="date" value={toDateInput(today.toISOString())} readOnly disabled />
              </AP_Field>
              <AP_Field label="Deliver on">
                <AP_Input type="date" value={delivery} disabled={!an.activated} onChange={(e) => setDelivery(e.target.value)} />
              </AP_Field>
              <AP_Field label="Analysis (h)" hint={inDays(Number(analysisH) || null) ?? undefined}>
                <AP_Input type="number" min={0} step={0.5} value={analysisH} disabled={!an.activated} onChange={(e) => setAnalysisH(e.target.value)} />
              </AP_Field>
              <AP_Field label="Development (h)" hint={inDays(Number(devH) || null) ?? undefined}>
                <AP_Input type="number" min={0} step={0.5} value={devH} disabled={!an.activated} onChange={(e) => setDevH(e.target.value)} />
              </AP_Field>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <AP_Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!an.activated || busy}
                onClick={() =>
                  save.mutate({
                    phase: "analysis",
                    body: { deliveryDate: delivery || null, analysisHours: analysisH === "" ? null : analysisH, developmentHours: devH === "" ? null : devH },
                  })
                }
              >
                Apply
              </AP_Button>
              <AP_Button type="button" size="sm" disabled={!canFinalizeAnalysis || busy} onClick={() => run.mutate({ phase: "analysis", action: "finalize" })}>
                Finalize
              </AP_Button>
              <AP_Button
                type="button"
                size="sm"
                variant="danger"
                disabled={!an.activated || busy}
                onClick={() => confirm(`Cancel request #${number}?`) && run.mutate({ phase: "analysis", action: "cancel" })}
              >
                Cancel
              </AP_Button>
            </div>
          </>
        )}
      </PhaseShell>

      {/* 3 — Solution development */}
      <PhaseShell
        title="Solution development"
        step={3}
        open={d.open}
        activated={d.activated}
        done={d.status === "FINALIZED"}
        cancelled={d.status === "CANCELLED"}
        onActivate={() => activate.mutate("development")}
        busy={busy}
      >
        {d.status === "FINALIZED" ? (
          <p className="text-xs text-emerald-700">Finalized — live.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              {d.status === "QA" ? `In QA since ${d.qaAt ? formatShortDate(d.qaAt) : "—"}.` : "Build the solution, send it to QA, then finalize when it is live."}
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <AP_Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!d.activated || d.status === "QA" || busy}
                onClick={() => run.mutate({ phase: "development", action: "launch-qa" })}
              >
                Launch QA
              </AP_Button>
              <AP_Button type="button" size="sm" disabled={!d.activated || busy} onClick={() => run.mutate({ phase: "development", action: "finalize" })}>
                Finalize
              </AP_Button>
              <AP_Button
                type="button"
                size="sm"
                variant="danger"
                disabled={!d.activated || busy}
                onClick={() => confirm(`Cancel request #${number}?`) && run.mutate({ phase: "development", action: "cancel" })}
              >
                Cancel
              </AP_Button>
            </div>
          </>
        )}
      </PhaseShell>
    </div>
  );
}
