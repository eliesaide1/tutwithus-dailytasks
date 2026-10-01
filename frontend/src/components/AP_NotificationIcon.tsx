import { Bell, CalendarClock, FolderKanban, ListTodo, Megaphone, MessageSquare, type LucideIcon } from "lucide-react";
import type { NotificationItem } from "@/Shared/Types";
import { cn } from "@/Shared/format";

type Kind = { icon: LucideIcon; tone: string; label: string };

const KINDS: Record<string, Kind> = {
  task: { icon: ListTodo, tone: "bg-brand-50 text-brand-700", label: "Task" },
  comment: { icon: MessageSquare, tone: "bg-violet-50 text-violet-700", label: "Comment" },
  request: { icon: FolderKanban, tone: "bg-sky-50 text-sky-700", label: "Request" },
  meeting: { icon: CalendarClock, tone: "bg-emerald-50 text-emerald-700", label: "Meeting" },
  announcement: { icon: Megaphone, tone: "bg-amber-50 text-amber-700", label: "Announcement" },
  other: { icon: Bell, tone: "bg-slate-100 text-slate-600", label: "Notification" },
};

/** What a notification is about, from its title and link (the backend sends plain text). */
export function notificationKind(n: Pick<NotificationItem, "title" | "link">): keyof typeof KINDS {
  const t = n.title.toLowerCase();
  if (t.startsWith("announcement") || n.link?.startsWith("/announcements")) return "announcement";
  if (t.includes("commented")) return "comment";
  if (t.includes("meeting") || n.link?.startsWith("/schedule")) return "meeting";
  if (t.includes("task")) return "task";
  if (n.link?.startsWith("/tasks")) return "request";
  return "other";
}

/** Round coloured icon showing the kind of notification. */
export function AP_NotificationIcon({ item, className }: { item: Pick<NotificationItem, "title" | "link">; className?: string }) {
  const kind = KINDS[notificationKind(item)]!;
  const Icon = kind.icon;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", kind.tone, className)} title={kind.label}>
      <Icon className="size-4" />
    </span>
  );
}
