import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import { allowed, useMe, type Gate } from "@/hooks/useAuth";

/** Wrap a route element (or use as a layout route) to restrict it by role. */
export function AP_RequireRole({ gate, children }: { gate: Gate; children?: ReactNode }) {
  const user = useMe();
  if (!allowed(user, gate)) return <Navigate to="/forbidden" replace />;
  return children ?? <Outlet />;
}
