import { Check, ChevronRight } from "lucide-react";
import type { NotificationItem } from "@/Shared/Types";
import { cn } from "@/Shared/format";
import { AP_NotificationIcon } from "./AP_NotificationIcon";

/** "just now", "18 min ago", "2 h ago", "Yesterday at 08:30", "Mon at 14:10", then "21 Sept". */
function friendlyTime(date: Date, now = new Date()) {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return `${Math.floor(mins / 60)} h ago`;
  const days = Math.ceil((startOfToday.getTime() - date.getTime()) / 86_400_000);
  if (days <= 1) return `Yesterday at ${time}`;
  if (days < 7) return `${date.toLocaleDateString("en-GB", { weekday: "short" })} at ${time}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/**
 * One notification. Clicking it marks it read and opens what it is about; the check
 * button marks it read without leaving the page.
 */
export function AP_NotificationItem({
  item,
  onOpen,
  onMarkRead,
  busy,
}: {
  item: NotificationItem;
  onOpen: () => void;
  onMarkRead: () => void;
  busy?: boolean;
}) {
  const unread = !item.read;
  const when = new Date(item.createdAt);
  return (
    <li className={cn("group relative flex items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5", unread && "bg-brand-50/50")}>
      {unread && <span className="absolute top-0 bottom-0 left-0 w-1 bg-brand-600" aria-hidden />}
      <AP_NotificationIcon item={item} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" disabled={busy}>
        <span className="flex items-start gap-2">
          <span className={cn("min-w-0 flex-1 text-sm leading-snug", unread ? "font-semibold text-slate-900" : "text-slate-700")}>{item.title}</span>
          {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
        </span>
        {item.body && <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">{item.body}</span>}
        <span className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <time dateTime={item.createdAt} title={when.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}>
            {friendlyTime(when)}
          </time>
          {item.link && (
            <span className="inline-flex items-center text-brand-600 opacity-0 transition group-hover:opacity-100">
              · Open <ChevronRight className="size-3.5" />
            </span>
          )}
        </span>
      </button>
      {unread && (
        <button
          type="button"
          onClick={onMarkRead}
          disabled={busy}
          className="rounded-full p-1.5 text-slate-400 opacity-100 transition hover:bg-white hover:text-emerald-600 hover:shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          title="Mark as read"
          aria-label={`Mark "${item.title}" as read`}
        >
          <Check className="size-4" />
        </button>
      )}
    </li>
  );
}
