import { Bug, FileText, LifeBuoy, ListTodo, Sparkles, type LucideIcon } from "lucide-react";
import { REQUEST_TYPE_LABELS, type RequestType } from "@/Shared/constants";
import { cn } from "@/Shared/format";

const TYPE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  BUG: { icon: Bug, color: "text-red-600" },
  FEATURE: { icon: Sparkles, color: "text-violet-600" },
  CONTENT: { icon: FileText, color: "text-amber-600" },
  SUPPORT: { icon: LifeBuoy, color: "text-emerald-600" },
  TASK: { icon: ListTodo, color: "text-brand-600" },
};

/** Icon for a request type (bug, feature, content, support, task). */
export function AP_TypeIcon({ type, className }: { type: string; className?: string }) {
  const { icon: Icon, color } = TYPE_ICONS[type] ?? TYPE_ICONS.TASK!;
  return <Icon className={cn("size-4 shrink-0", color, className)} aria-label={REQUEST_TYPE_LABELS[type as RequestType] ?? type} />;
}
