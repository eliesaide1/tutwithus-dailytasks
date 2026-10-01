import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { BellOff, CheckCheck, PartyPopper } from "lucide-react";
import { GetNotifications, MarkAllNotificationsRead, MarkNotificationRead } from "@/Shared/SharedService";
import type { NotificationItem } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParam } from "@/hooks/useQueryParam";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_NotificationItem } from "@/components/AP_NotificationItem";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { AP_Tabs } from "@/components/AP_Tabs";

const DAY = 86_400_000;

/** Today / Yesterday / Earlier this week / Older, in the viewer's local time. */
function groupByDate(items: NotificationItem[], now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: { label: string; items: NotificationItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier this week", items: [] },
    { label: "Older", items: [] },
  ];
  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    const i = t >= startOfToday ? 0 : t >= startOfToday - DAY ? 1 : t >= startOfToday - 6 * DAY ? 2 : 3;
    groups[i]!.items.push(n);
  }
  return groups.filter((g) => g.items.length > 0);
}

export default function NotificationsScreen() {
  useDocumentTitle("Notifications");
  const navigate = useNavigate();
  const [filter] = useQueryParam("filter");
  const onlyUnread = filter === "unread";
  const { data, isLoading, error } = useQuery({ queryKey: ["notifications", "list"], queryFn: GetNotifications });
  const invalidate = [["notifications"]];
  const markRead = useApiMutation(MarkNotificationRead, { invalidate });
  const readAll = useApiMutation(MarkAllNotificationsRead, { invalidate });

  const all = data ?? [];
  const unread = all.filter((n) => !n.read).length;
  const shown = onlyUnread ? all.filter((n) => !n.read) : all;
  const groups = groupByDate(shown);

  const open = (n: NotificationItem) =>
    markRead.mutate(n.id, {
      onSuccess: () => {
        if (n.link?.startsWith("/")) navigate(n.link);
      },
    });

  return (
    <div className="max-w-3xl">
      <AP_PageHeader
        title="Notifications"
        description={unread ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.` : "You're all caught up."}
        actions={
          unread > 0 && (
            <AP_Button variant="secondary" onClick={() => readAll.mutate(undefined)} disabled={readAll.isPending}>
              <CheckCheck className="size-4" /> Mark all as read
            </AP_Button>
          )
        }
      />

      <AP_Tabs
        active={onlyUnread ? "unread" : "all"}
        items={[
          { key: "all", label: `All (${all.length})`, to: "/notifications" },
          { key: "unread", label: `Unread (${unread})`, to: "/notifications?filter=unread" },
        ]}
      />

      <AP_QueryState isLoading={isLoading} error={error}>
        {groups.length === 0 ? (
          <AP_Card className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {onlyUnread ? <PartyPopper className="size-6" /> : <BellOff className="size-6" />}
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-800">{onlyUnread ? "No unread notifications" : "No notifications yet"}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {onlyUnread
                ? "You've read everything. New tasks, comments and meeting invitations will show up here."
                : "You'll be notified when someone assigns you a task, comments on your request, or invites you to a meeting."}
            </p>
          </AP_Card>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.label}>
                <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.label}</h2>
                <AP_Card className="overflow-hidden">
                  <ul className="divide-y divide-slate-100">
                    {g.items.map((n) => (
                      <AP_NotificationItem
                        key={n.id}
                        item={n}
                        busy={markRead.isPending && markRead.variables === n.id}
                        onOpen={() => open(n)}
                        onMarkRead={() => markRead.mutate(n.id)}
                      />
                    ))}
                  </ul>
                </AP_Card>
              </section>
            ))}
          </div>
        )}
      </AP_QueryState>
    </div>
  );
}
