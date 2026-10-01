import { SetTaskStatus } from "@/Shared/SharedService";
import { useApiMutation } from "@/hooks/useApiMutation";
import { TASK_KEYS } from "@/hooks/useTasks";

/** Checkbox that toggles a task between done and to-do. */
export function AP_DoneCheckbox({ id, done, disabled, label }: { id: string; done: boolean; disabled?: boolean; label: string }) {
  const save = useApiMutation((status: string) => SetTaskStatus(id, status), { invalidate: [...TASK_KEYS] });
  const checked = save.isPending ? save.variables === "DONE" : done;
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled || save.isPending}
      aria-label={done ? `Mark "${label}" as not done` : `Mark "${label}" as done`}
      onChange={() => save.mutate(done ? "TODO" : "DONE")}
      className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:cursor-not-allowed"
    />
  );
}
