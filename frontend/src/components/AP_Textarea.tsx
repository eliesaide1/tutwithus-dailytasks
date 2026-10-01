import { type ComponentProps } from "react";
import { cn } from "@/Shared/format";

export function AP_Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("field min-h-24", className)} {...props} />;
}
