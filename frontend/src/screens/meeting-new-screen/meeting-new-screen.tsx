import { useSearchParams } from "react-router";
import { useMeetingFormOptions } from "@/hooks/useSchedule";
import { AP_MeetingForm } from "@/components/AP_MeetingForm";
import { useMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Card } from "@/components/AP_Card";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_QueryState } from "@/components/AP_QueryState";

export default function MeetingNewScreen() {
  useDocumentTitle("New meeting");
  const me = useMe();
  const [params] = useSearchParams();
  const options = useMeetingFormOptions();

  return (
    <>
      <AP_PageHeader title="New meeting" description="Attendees are notified and asked to confirm." />
      <AP_QueryState isLoading={options.isLoading} error={options.error}>
        {options.data &&
          (() => {
            const { people, zones } = options.data;
            // Prefill from "Find a time" (?date=&start=&end=&tz=&attendees=a,b).
            const attendees = (params.get("attendees") ?? "").split(",").filter((id) => people.some((p) => p.id === id));
            const date = params.get("date") ?? "";
            const tz = params.get("tz") ?? "";
            return (
              <AP_Card className="p-6">
                <AP_MeetingForm
                  people={people}
                  zones={zones}
                  initial={{
                    title: "",
                    purpose: "",
                    agenda: "",
                    location: "",
                    recurrence: date ? "ONCE" : "WEEKLY",
                    dayOfWeek: date ? new Date(`${date}T00:00:00Z`).getUTCDay() : 1,
                    date,
                    start: params.get("start") || "18:00",
                    end: params.get("end") || "18:30",
                    timezone: zones.some((z) => z.value === tz) ? tz : me.timezone,
                    validFrom: "",
                    validUntil: "",
                    attendees: attendees.length ? attendees : [me.id],
                  }}
                />
              </AP_Card>
            );
          })()}
      </AP_QueryState>
    </>
  );
}
