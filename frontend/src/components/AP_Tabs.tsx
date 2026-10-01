import { Link } from "react-router";
import { cn } from "@/Shared/format";

/** Simple tab strip driven by links. */
export function AP_Tabs({ items, active }: { items: { to: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {items.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
            t.key === active
              ? "border-brand-700 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
