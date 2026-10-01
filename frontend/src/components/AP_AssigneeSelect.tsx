import { AssignTask } from "@/Shared/SharedService";
import type { TeamPerson } from "@/Shared/Types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { TASK_KEYS } from "@/hooks/useTasks";
import { cn } from "@/Shared/format";
import { personWithTitle } from "@/Shared/SharedFunctions";

/**
 * Lets a request's owner (the department manager) hand a task to someone on their team.
 * Saves as soon as a person is picked.
 */
export function AP_AssigneeSelect({
  taskId,
  current,
  team,
  className,
}: {
  taskId: string;
  current: string | null;
  team: TeamPerson[];
  className?: string;
}) {
  const save = useApiMutation((assignee: string) => AssignTask(taskId, assignee), { invalidate: [...TASK_KEYS] });
  const value = save.isPending ? (save.variables ?? "") : (current ?? "");
  return (
    <select
      aria-label="Assign to"
      value={value}
      disabled={save.isPending}
      onChange={(e) => e.target.value && save.mutate(e.target.value)}
      className={cn("field w-auto py-1 text-xs", className)}
    >
      {!current && <option value="">Assign to…</option>}
      {team.map((p) => (
        <option key={p.id} value={p.id}>
          {personWithTitle(p)}
        </option>
      ))}
    </select>
  );
}
