// React Query hooks for the schedule screens. All time-zone conversion happens on the
// server (DST-aware); the client only lays out already-converted minutes.
import { useQuery } from "@tanstack/react-query";
import { GetAvailability, GetMeeting, GetMeetingFormOptions, GetSchedule } from "@/Shared/SharedService";

export const scheduleKey = ["schedule"] as const;

export function useSchedule(week: string, tz: string) {
  return useQuery({
    queryKey: [...scheduleKey, "week", week, tz],
    queryFn: () => GetSchedule(week, tz),
    placeholderData: (prev) => prev,
  });
}

export function useMeetingFormOptions() {
  return useQuery({ queryKey: [...scheduleKey, "form-options"], queryFn: GetMeetingFormOptions });
}

export function useMeeting(id: string) {
  return useQuery({ queryKey: [...scheduleKey, "meeting", id], queryFn: () => GetMeeting(id) });
}

export function useAvailability(userId: string) {
  return useQuery({ queryKey: [...scheduleKey, "availability", userId], queryFn: () => GetAvailability(userId) });
}
