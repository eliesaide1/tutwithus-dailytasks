// Query keys for people screens and a helper to refresh them after a change.
import { useQueryClient } from "@tanstack/react-query";
import { lookupsKey } from "./useLookups";

export const peopleKeys = {
  all: ["people"] as const,
  directory: ["people", "directory"] as const,
  orgChart: ["people", "org-chart"] as const,
  profile: (id: string) => ["people", "profile", id] as const,
  teams: ["people", "teams"] as const,
  team: (id: string) => ["people", "teams", id] as const,
  adminUsers: ["people", "admin-users"] as const,
  adminUser: (id: string) => ["people", "admin-users", id] as const,
};

/** Refresh everything people-related (directory, chart, teams, admin list, lookups). */
export function useInvalidatePeople() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: peopleKeys.all }),
      qc.invalidateQueries({ queryKey: lookupsKey }),
    ]);
}
