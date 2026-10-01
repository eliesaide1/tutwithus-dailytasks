import { TASK_KINDS } from "@/Shared/constants";
import { toDateInput } from "@/Shared/format";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_Select } from "./AP_Select";
import { AP_Textarea } from "./AP_Textarea";

type Option = { id: string; name: string };

/** Fields for creating/editing one task. Names match the backend task input. */
export function AP_TaskFields({
  people,
  task,
}: {
  people: Option[];
  task?: {
    title: string;
    kind: string;
    assignee: { id: string } | null;
    estimateMins: number | null;
    dueDate: string | null;
    plannedWeek: string | null;
    blocker: string | null;
    description: string | null;
  };
}) {
  const kinds: string[] = [...TASK_KINDS];
  if (task && !kinds.includes(task.kind)) kinds.push(task.kind);
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <AP_Field label="Task" className="sm:col-span-6">
        <AP_Input name="title" required maxLength={200} defaultValue={task?.title} />
      </AP_Field>
      <AP_Field label="Kind" className="sm:col-span-2">
        <AP_Select name="kind" defaultValue={task?.kind ?? "General"}>
          {kinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </AP_Select>
      </AP_Field>
      <AP_Field label="Assignee" className="sm:col-span-2">
        <AP_Select name="assignee" defaultValue={task?.assignee?.id ?? ""}>
          <option value="">Unassigned</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </AP_Select>
      </AP_Field>
      <AP_Field label="Estimate (h)" className="sm:col-span-2">
        <AP_Input name="estimateHours" type="number" min={0} step={0.25} defaultValue={task?.estimateMins != null ? task.estimateMins / 60 : ""} />
      </AP_Field>
      <AP_Field label="Due" className="sm:col-span-3">
        <AP_Input name="dueDate" type="date" defaultValue={toDateInput(task?.dueDate)} />
      </AP_Field>
      <AP_Field label="Planned week (any day)" className="sm:col-span-3">
        <AP_Input name="plannedWeek" type="date" defaultValue={toDateInput(task?.plannedWeek)} />
      </AP_Field>
      <AP_Field label="Blocker" className="sm:col-span-6">
        <AP_Input name="blocker" maxLength={500} defaultValue={task?.blocker ?? ""} placeholder="What is stopping this task, if anything" />
      </AP_Field>
      <AP_Field label="Notes" className="sm:col-span-6">
        <AP_Textarea name="description" rows={2} defaultValue={task?.description ?? ""} className="min-h-0" />
      </AP_Field>
    </div>
  );
}
