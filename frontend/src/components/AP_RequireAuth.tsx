import { Navigate, Outlet, useLocation } from "react-router";
import { useMeQuery } from "@/hooks/useAuth";
import { AP_FullPageSpinner } from "./AP_FullPageSpinner";

/** Layout route guard: sign-in required; temporary passwords must be changed first. */
export function AP_RequireAuth() {
  const { data: user, isLoading } = useMeQuery();
  const location = useLocation();
  if (isLoading) return <AP_FullPageSpinner />;
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (user.mustChangePassword && location.pathname !== "/account") return <Navigate to="/account?first=1" replace />;
  return <Outlet />;
}
