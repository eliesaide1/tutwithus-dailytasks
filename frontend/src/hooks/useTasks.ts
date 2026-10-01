// React Query hooks for requests, tasks, the weekly board and projects.
import { useQuery } from "@tanstack/react-query";
import { GetMyWeek, GetProjectTeam, GetProjects, GetRequest, GetTaskTree } from "@/Shared/SharedService";
import { lookupsKey } from "@/hooks/useLookups";

/** Query keys to refresh after any task/request change. */
export const TASK_KEYS = [["tasks"], ["my-week"], ["dashboard"], ["workload"]] as const;
export const PROJECT_KEYS = [["projects"], lookupsKey, ["tasks"]] as const;

export function useTaskTree(params: { person: string; show: string; project: string }) {
  return useQuery({ queryKey: ["tasks", "tree", params], queryFn: () => GetTaskTree(params) });
}

export function useRequest(number: string | undefined) {
  return useQuery({ queryKey: ["tasks", "detail", number], queryFn: () => GetRequest(number!), enabled: !!number });
}

export function useMyWeek(user: string, week: string) {
  return useQuery({ queryKey: ["my-week", user, week], queryFn: () => GetMyWeek(user, week) });
}

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: GetProjects });
}

/** Manager and team of a project (owner + allowed assignees for its tasks). */
export function useProjectTeam(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", "team", projectId],
    queryFn: () => GetProjectTeam(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}
