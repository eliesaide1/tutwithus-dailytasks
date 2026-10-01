import type { ReactNode } from "react";
import { cn } from "@/Shared/format";
import { AP_Card } from "./AP_Card";

/** Number tile for report summaries. */
export function AP_SummaryTile({
  icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "green" | "amber" | "red";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <AP_Card className="flex items-center gap-4 p-4">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl leading-tight font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
    </AP_Card>
  );
}
