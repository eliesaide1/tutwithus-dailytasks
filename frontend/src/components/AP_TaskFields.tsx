import { useState } from "react";
import { TASK_KINDS } from "@/Shared/constants";
import { toDateInput } from "@/Shared/format";
import { useLookups } from "@/hooks/useLookups";
import { AP_Checkbox } from "./AP_Checkbox";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_Select } from "./AP_Select";
import { AP_Textarea } from "./AP_Textarea";

type Option = { id: string; name: string };

/** Fields for creating/editing one task. Names match the backend task input. */
export function AP_TaskFields({
  people,
  task,
  /** Offer the department fan-out. Only meaningful when raising a task, not editing one. */
  allowDepartments = false,
}: {
  people: Option[];
  allowDepartments?: boolean;
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
  const { departments } = useLookups();
  const [picked, setPicked] = useState<string[]>([]);
  const fannedOut = picked.length > 0;
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <AP_Field label="Task" className="sm:col-span-6">
        {/* A textarea so a long task wraps instead of scrolling out of sight. */}
        <AP_Textarea name="title" required rows={2} maxLength={500} defaultValue={task?.title} className="min-h-0" />
      </AP_Field>
      <AP_Field label="Kind" className="sm:col-span-2">
        <AP_Select name="kind" defaultValue={task?.kind ?? "General"}>
          {kinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </AP_Select>
      </AP_Field>
      <AP_Field
        label="Assignee"
        className="sm:col-span-2"
        hint={fannedOut ? "each department's lead" : undefined}
      >
        <AP_Select name="assignee" defaultValue={task?.assignee?.id ?? ""} disabled={fannedOut}>
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
      {allowDepartments && departments.length > 0 && (
        <div className="sm:col-span-6">
          <p className="label">Raise it for several departments</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {departments.map((d) => (
              <AP_Checkbox
                key={d.id}
                name="departments"
                value={d.id}
                label={d.name}
                checked={picked.includes(d.id)}
                onChange={(e) =>
                  setPicked((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)))
                }
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {fannedOut
              ? `${picked.length} separate task(s) — one per department, each going to that department's lead. One finishing leaves the others open.`
              : "Leave these unticked for a single task assigned to one person."}
          </p>
        </div>
      )}
    </div>
  );
}
