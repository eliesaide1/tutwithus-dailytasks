import { Link, Outlet, ScrollRestoration } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { GetUnreadCount } from "@/Shared/SharedService";
import { NAV } from "@/Shared/Navigation";
import { zoneLabel } from "@/Shared/time";
import { allowed, useMe } from "@/hooks/useAuth";
import { AP_BackButton } from "./AP_BackButton";
import { AP_Sidebar } from "./AP_Sidebar";
import { AP_UserMenu } from "./AP_UserMenu";

/** Signed-in page frame: sidebar, top bar (back, time zone, notifications, user menu) and the screen. */
export function AP_AppLayout() {
  const user = useMe();
  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: GetUnreadCount,
    refetchInterval: 60_000,
    enabled: !user.mustChangePassword, // the API refuses everything until the password is changed
  });

  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.access === "all" || allowed(user, i.access)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen">
      {/* Going back returns to the same scroll position (e.g. the day you were looking at). */}
      <ScrollRestoration getKey={(location) => location.pathname + location.search} />
      <AP_Sidebar sections={sections} />
      <div className="print-full lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="mr-auto ml-10 flex min-w-0 items-center gap-3 lg:ml-0">
            <AP_BackButton />
            <span className="hidden truncate text-xs text-slate-500 md:block">Your time zone: {zoneLabel(user.timezone)}</span>
          </div>
          <Link
            to="/notifications"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <AP_UserMenu />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
