import type { ReactNode } from "react";
import { cn } from "@/Shared/format";

/**
 * One row of the My week agenda: the day (or group) on the left, its task cards on the
 * right. Empty rows stay a single line, on phones too.
 */
export function AP_WeekDayRow({
  label,
  sublabel,
  count,
  tone = "default",
  badge,
  emptyText = "No tasks",
  children,
}: {
  label: string;
  sublabel?: string;
  count: number;
  tone?: "default" | "today" | "red" | "muted";
  badge?: string;
  emptyText?: string;
  children?: ReactNode;
}) {
  const empty = count === 0;
  return (
    <section
      className={cn(
        "flex gap-3 border-l-4 px-4 py-3 sm:gap-6 sm:px-5",
        empty ? "flex-row items-center" : "flex-col sm:flex-row",
        tone === "today" && "border-l-brand-700 bg-brand-50/60",
        tone === "red" && "border-l-red-500 bg-red-50/40",
        (tone === "default" || tone === "muted") && "border-l-transparent",
      )}
    >
      <header className="w-36 shrink-0">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "text-sm font-semibold",
              tone === "today" ? "text-brand-800" : tone === "red" ? "text-red-700" : tone === "muted" ? "text-slate-500" : "text-slate-800",
            )}
          >
            {label}
          </h3>
          {badge && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">{badge}</span>}
          {!empty && (
            <span
              className={cn(
                "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold",
                tone === "red" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600",
              )}
              title={`${count} task${count === 1 ? "" : "s"}`}
            >
              {count}
            </span>
          )}
        </div>
        {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
      </header>
      {empty ? (
        <p className="flex-1 text-xs text-slate-400">{emptyText}</p>
      ) : (
        <ul className="grid min-w-0 flex-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3">{children}</ul>
      )}
    </section>
  );
}
