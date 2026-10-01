import type { ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import { REQUEST_TYPES, REQUEST_TYPE_LABELS } from "@/Shared/constants";
import { cn } from "@/Shared/format";
import { AP_TypeIcon } from "./AP_TypeIcon";

const TYPE_HINTS: Record<string, string> = {
  CONTENT: "posts, reports, text",
  TASK: "general work",
  SUPPORT: "tutor / client help",
  FEATURE: "something new to build",
  BUG: "something to fix",
};

function Item({ icon, label, hint, inline }: { icon: ReactNode; label: string; hint?: string; inline: boolean }) {
  return (
    <li className="flex items-center gap-1.5 whitespace-nowrap">
      {icon}
      <span className="font-medium text-slate-700">{label}</span>
      {hint && !inline && <span className="text-slate-400">– {hint}</span>}
    </li>
  );
}

/** Key for the icons and timing labels used in the task tree. `inline` = one wrapped row. */
export function AP_TaskLegend({ inline = false, className }: { inline?: boolean; className?: string }) {
  return (
    <aside aria-label="What the icons mean" className={cn("rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-500 shadow-xs", className)}>
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Legend</p>
      <ul className={cn(inline ? "flex flex-wrap gap-x-4 gap-y-1.5" : "space-y-1.5")}>
        <Item inline={inline} icon={<FolderOpen className="size-3.5 text-emerald-600" />} label="Request" hint="open" />
        <Item inline={inline} icon={<FolderOpen className="size-3.5 text-slate-400" />} label="Cancelled" />
        {REQUEST_TYPES.map((t) => (
          <Item key={t} inline={inline} icon={<AP_TypeIcon type={t} className="size-3.5" />} label={REQUEST_TYPE_LABELS[t]} hint={TYPE_HINTS[t]} />
        ))}
      </ul>
      <ul className={cn("mt-2 border-t border-slate-100 pt-2", inline ? "flex flex-wrap gap-x-4 gap-y-1" : "space-y-1")}>
        <li>
          <span className="font-semibold text-amber-700">(Rem. …)</span> time left
        </li>
        <li>
          <span className="font-semibold text-red-600">(Overdue …)</span> past due
        </li>
        <li>
          <span className="font-semibold text-red-700/80">(… ago)</span> open since, no due date
        </li>
      </ul>
    </aside>
  );
}
