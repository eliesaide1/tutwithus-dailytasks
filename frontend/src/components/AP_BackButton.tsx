import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

/**
 * Returns to the previous page in the app. When the page was opened directly (new tab,
 * bookmark, notification link) there is no in-app history, so it goes to the dashboard.
 */
export function AP_BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  const hasHistory = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  return (
    <button
      type="button"
      onClick={() => (hasHistory ? navigate(-1) : navigate("/"))}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
      title={hasHistory ? "Go back to the previous page" : "Go to the dashboard"}
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}
