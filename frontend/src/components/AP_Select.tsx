import { type ComponentProps } from "react";
import { cn } from "@/Shared/format";

export function AP_Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("field pr-8", className)} {...props} />;
}
