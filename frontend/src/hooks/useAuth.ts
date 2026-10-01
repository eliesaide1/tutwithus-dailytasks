// The signed-in user (from the backend session) and role checks.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GetSessionUser } from "@/Shared/SharedService";
import type { SessionUser } from "@/Shared/Types";

export const meQueryKey = ["auth", "me"] as const;

export function useMeQuery() {
  return useQuery({ queryKey: meQueryKey, queryFn: GetSessionUser, staleTime: 5 * 60_000, retry: false });
}

/** The signed-in user. Only use inside routes wrapped by <AP_RequireAuth>. */
export function useMe(): SessionUser {
  const { data } = useMeQuery();
  if (!data) throw new Error("useMe() used outside an authenticated route");
  return data;
}

export function useSetMe() {
  const qc = useQueryClient();
  return (user: SessionUser | null) => qc.setQueryData(meQueryKey, user);
}

export type Gate = "manager" | "admin";

export function allowed(user: SessionUser, gate: Gate) {
  return gate === "admin" ? user.permissions.isAdmin : user.permissions.isManager;
}
