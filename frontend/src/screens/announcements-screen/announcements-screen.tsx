import { useQuery } from "@tanstack/react-query";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { formatAge } from "@/Shared/format";
import { DeleteAnnouncement, GetAnnouncements, ToggleAnnouncementPin } from "@/Shared/SharedService";
import { AP_AnnouncementForm } from "@/components/AP_AnnouncementForm";
import { useMe } from "@/hooks/useAuth";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Avatar } from "@/components/AP_Avatar";
import { AP_Badge } from "@/components/AP_Badge";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_EmptyState } from "@/components/AP_EmptyState";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";


const invalidate = [["announcements"], ["dashboard"]];

export default function AnnouncementsScreen() {
  useDocumentTitle("Announcements");
  const manager = useMe().permissions.isManager;
  const { data, isLoading, error } = useQuery({
    queryKey: ["announcements"],
    queryFn: GetAnnouncements,
  });
  const pin = useApiMutation(ToggleAnnouncementPin, { invalidate });
  const remove = useApiMutation(DeleteAnnouncement, { invalidate });

  return (
    <div>
      <AP_PageHeader title="Announcements" description="Team-wide news and decisions." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AP_QueryState isLoading={isLoading} error={error}>
            {data?.length === 0 && (
              <AP_Card>
                <AP_EmptyState title="No announcements yet" />
              </AP_Card>
            )}
            {data?.map((a) => (
              <AP_Card key={a.id} className="p-5">
                <div className="flex items-start gap-3">
                  <AP_Avatar name={a.author?.name ?? "Team"} src={a.author?.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{a.title}</h2>
                      {a.pinned && <AP_Badge tone="yellow">Pinned</AP_Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {a.author?.name ?? "Team"} · {formatAge(a.createdAt)}
                    </p>
                    <p className="mt-3 text-sm whitespace-pre-line text-slate-700">{a.body}</p>
                  </div>
                  {manager && (
                    <div className="flex shrink-0 gap-1">
                      <AP_Button variant="ghost" size="sm" title={a.pinned ? "Unpin" : "Pin"} aria-label={a.pinned ? "Unpin" : "Pin"} onClick={() => pin.mutate(a.id)}>
                        {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                      </AP_Button>
                      <AP_Button
                        variant="ghost"
                        size="sm"
                        title="Delete"
                        aria-label="Delete"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => confirm(`Delete "${a.title}"?`) && remove.mutate(a.id)}
                      >
                        <Trash2 className="size-4" />
                      </AP_Button>
                    </div>
                  )}
                </div>
              </AP_Card>
            ))}
          </AP_QueryState>
        </div>
        {manager && (
          <AP_Card className="h-fit">
            <AP_CardHeader title="New announcement" />
            <AP_AnnouncementForm />
          </AP_Card>
        )}
      </div>
    </div>
  );
}
