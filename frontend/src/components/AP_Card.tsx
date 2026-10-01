import { type ComponentProps } from "react";
import { cn } from "@/Shared/format";

export function AP_Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-xs", className)} {...props} />
  );
}
