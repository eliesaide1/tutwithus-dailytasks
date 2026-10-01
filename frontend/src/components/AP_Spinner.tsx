import { cn } from "@/Shared/format";

export function AP_Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-5 animate-spin rounded-full border-2 border-brand-100 border-t-brand-700", className)} />;
}
