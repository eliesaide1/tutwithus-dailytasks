import { useNavigate, useParams } from "react-router";
import { TriangleAlert } from "lucide-react";
import { formatMinute } from "@/Shared/time";
import { toDateInput } from "@/Shared/format";
import { scheduleKey, useMeeting, useMeetingFormOptions } from "@/hooks/useSchedule";
import { AP_MeetingForm } from "@/components/AP_MeetingForm";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";
import { DeleteMeeting } from "@/Shared/SharedService";

export default function MeetingEditScreen() {
  useDocumentTitle("Edit meeting");
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const meeting = useMeeting(id);
  const options = useMeetingFormOptions();
  const remove = useApiMutation(() => DeleteMeeting(id), {
    invalidate: [scheduleKey],
    onSuccess: () => navigate("/schedule?tab=meetings"),
  });

  const m = meeting.data?.meeting;
  const conflicts = meeting.data?.conflicts ?? [];

  return (
    <AP_QueryState isLoading={meeting.isLoading || options.isLoading} error={meeting.error ?? options.error}>
      {m && options.data && (
        <>
          <AP_PageHeader
            title="Edit meeting"
            description={m.title}
            actions={
              <AP_Button
                variant="danger"
                size="sm"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete "${m.title}"? Attendees will be notified.`)) remove.mutate(undefined);
                }}
              >
                Delete meeting
              </AP_Button>
            }
          />
          {conflicts.length > 0 && (
            <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                Outside declared availability for:{" "}
                {conflicts.map((c, i) => (
                  <span key={c.name}>
                    {i > 0 && ", "}
                    <strong>{c.name}</strong> ({c.local})
                  </span>
                ))}
                . Saving is still allowed.
              </div>
            </div>
          )}
          <AP_Card className="p-6">
            <AP_MeetingForm
              key={m.id}
              people={options.data.people}
              zones={options.data.zones}
              initial={{
                id: m.id,
                title: m.title,
                purpose: m.purpose ?? "",
                agenda: m.agenda ?? "",
                location: m.location ?? "",
                recurrence: m.recurrence === "ONCE" ? "ONCE" : "WEEKLY",
                dayOfWeek: m.dayOfWeek ?? 1,
                date: toDateInput(m.date),
                start: formatMinute(m.startMinute),
                end: formatMinute(m.endMinute),
                timezone: m.timezone,
                validFrom: toDateInput(m.validFrom),
                validUntil: toDateInput(m.validUntil),
                attendees: m.attendees.map((a) => a.userId),
              }}
            />
          </AP_Card>
        </>
      )}
    </AP_QueryState>
  );
}
