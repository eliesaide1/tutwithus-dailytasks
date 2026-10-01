import { useQuery } from "@tanstack/react-query";
import { GetLookups } from "@/Shared/SharedService";

export const lookupsKey = ["lookups"] as const;

/** Active people, departments and projects for selectors. Invalidate `lookupsKey` after changing them. */
export function useLookups() {
  const q = useQuery({ queryKey: lookupsKey, queryFn: GetLookups, staleTime: 60_000 });
  const data = q.data ?? { users: [], departments: [], projects: [] };
  const userById = new Map(data.users.map((u) => [u.id, u]));
  return { ...q, ...data, userById };
}
