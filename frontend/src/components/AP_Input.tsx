import { type ComponentProps } from "react";
import { cn } from "@/Shared/format";

export function AP_Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("field", className)} {...props} />;
}
