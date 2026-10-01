import { Link, useLocation } from "react-router";
import { useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  Contact,
  FileText,
  FolderKanban,
  Gauge,
  Globe,
  GraduationCap,
  History,
  Image,
  LayoutDashboard,
  ListTree,
  Megaphone,
  Menu,
  Network,
  Package,
  Quote,
  Settings2,
  ShieldCheck,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { AP_Logo } from "./AP_Logo";
import { cn } from "@/Shared/format";
import type { NavSection } from "@/Shared/Navigation";

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  Contact,
  FileText,
  FolderKanban,
  Gauge,
  Globe,
  GraduationCap,
  History,
  Image,
  LayoutDashboard,
  ListTree,
  Megaphone,
  Network,
  Package,
  Quote,
  Settings2,
  ShieldCheck,
  UsersRound,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AP_Sidebar({ sections }: { sections: NavSection[] }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-brand-200/70 uppercase">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon] ?? FileText;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/12 font-semibold text-white shadow-[inset_3px_0_0] shadow-accent-500"
                        : "text-brand-100 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed top-3.5 left-3 z-40 rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-800 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link to="/">
            <AP_Logo inverted />
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="text-brand-100 lg:hidden" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
