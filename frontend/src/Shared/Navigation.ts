// Single source of truth for the sidebar. `access` hides items the user cannot open.
export type NavAccess = "all" | "manager" | "admin";

export type NavItem = { href: string; label: string; icon: string; access: NavAccess };
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "Work",
    items: [
      { href: "/", label: "Dashboard", icon: "LayoutDashboard", access: "all" },
      { href: "/my-week", label: "My week", icon: "CalendarCheck", access: "all" },
      { href: "/tasks", label: "Tasks", icon: "ListTree", access: "all" },
      { href: "/workload", label: "Workload", icon: "Gauge", access: "all" },
    ],
  },
  {
    title: "Team",
    items: [
      { href: "/org-chart", label: "Org chart", icon: "Network", access: "all" },
      { href: "/people", label: "Directory", icon: "Contact", access: "all" },
      { href: "/teams", label: "Teams", icon: "UsersRound", access: "all" },
      { href: "/schedule", label: "Schedule", icon: "CalendarClock", access: "all" },
      { href: "/announcements", label: "Announcements", icon: "Megaphone", access: "all" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/reports", label: "Done report", icon: "ClipboardCheck", access: "admin" },
      { href: "/admin/users", label: "Users & access", icon: "ShieldCheck", access: "admin" },
      { href: "/admin/projects", label: "Projects", icon: "FolderKanban", access: "admin" },
      { href: "/admin/activity", label: "Activity log", icon: "History", access: "admin" },
    ],
  },
];
