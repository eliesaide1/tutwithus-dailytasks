import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/Shared/format";
import { AP_Card } from "./AP_Card";

/** Dashboard number tile (icon, value, label) that links to My week. */
export function AP_StatCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone?: "red" | "amber" }) {
  return (
    <Link to="/my-week">
      <AP_Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            tone === "red" ? "bg-red-50 text-red-600" : tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-700",
          )}
        >
          {icon}
        </span>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </AP_Card>
    </Link>
  );
}
