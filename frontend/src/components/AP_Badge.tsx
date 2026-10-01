import { type ComponentProps } from "react";
import { cn } from "@/Shared/format";

const badgeTones = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  yellow: "bg-accent-100 text-amber-900 ring-amber-200",
};
export type BadgeTone = keyof typeof badgeTones;

export function AP_Badge({
  tone = "slate",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}
