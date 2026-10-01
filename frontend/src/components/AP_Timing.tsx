import { cn, formatAge } from "@/Shared/format";

/**
 * DQtasks-style timing hint: "(Rem. 3 d, 7.6 h)" before the due date,
 * "(Overdue 2 d, 1.0 h)" after it, otherwise the age since creation.
 */
export function AP_Timing({ createdAt, dueDate, closed, now = new Date() }: { createdAt: string; dueDate: string | null; closed: boolean; now?: Date }) {
  if (dueDate && !closed) {
    const due = new Date(dueDate);
    const text = formatAge(due, now).replace(/^in /, "").replace(/ ago$/, "");
    return due > now ? (
      <span className="text-xs font-semibold whitespace-nowrap text-amber-700">(Rem. {text})</span>
    ) : (
      <span className="text-xs font-semibold whitespace-nowrap text-red-600">(Overdue {text})</span>
    );
  }
  return (
    <span className={cn("text-xs font-semibold whitespace-nowrap", closed ? "text-slate-400" : "text-red-700/80")}>({formatAge(createdAt, now)})</span>
  );
}
