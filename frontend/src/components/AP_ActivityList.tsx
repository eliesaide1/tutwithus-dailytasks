import { Link } from "react-router";
import type { ActivityRow } from "@/Shared/Types";
import { cn, formatAge } from "@/Shared/format";
import { AP_Avatar } from "./AP_Avatar";
import { AP_EmptyState } from "./AP_EmptyState";

/** Who-did-what feed. `compact` is the dashboard card style; otherwise a full-width log row. */
export function AP_ActivityList({ items, compact }: { items: ActivityRow[]; compact?: boolean }) {
  if (items.length === 0) return <AP_EmptyState title="No activity yet" />;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((a) => (
        <li key={a.id} className={cn("flex gap-3 px-5", compact ? "py-2.5" : "items-center py-2.5")}>
          <AP_Avatar name={a.actor?.name ?? "System"} src={a.actor?.avatarUrl} size={compact ? 26 : 28} />
          <div className={cn("min-w-0", compact ? "text-xs" : "flex-1 text-sm")}>
            <p className="text-slate-700">
              <span className="font-semibold text-slate-800">{a.actor?.name ?? "System"}</span>{" "}
              {a.link ? (
                <Link to={a.link} className="hover:underline">
                  {a.summary}
                </Link>
              ) : (
                a.summary
              )}
            </p>
            {compact && <p className="text-slate-400">{formatAge(a.createdAt)}</p>}
          </div>
          {!compact && (
            <span className="w-32 shrink-0 text-right text-xs text-slate-400" title={a.createdAt}>
              {formatAge(a.createdAt)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
