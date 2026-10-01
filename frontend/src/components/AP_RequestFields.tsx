import { useState } from "react";
import { PRIORITIES, PRIORITY_LABELS, REQUEST_TYPES, REQUEST_TYPE_LABELS } from "@/Shared/constants";
import { toDateInput } from "@/Shared/format";
import { useProjectTeam } from "@/hooks/useTasks";
import { AP_Field } from "./AP_Field";
import { AP_OwnerField } from "./AP_OwnerField";
import { AP_Input } from "./AP_Input";
import { AP_Select } from "./AP_Select";
import { AP_Textarea } from "./AP_Textarea";

/** Fields for editing a request. Names match the backend request input. */
export function AP_RequestFields({
  projects,
  request,
}: {
  projects: { id: string; code: string; name: string }[];
  request: {
    project: { id: string };
    title: string;
    description: string | null;
    type: string;
    priority: string;
    owner: { id: string; name: string } | null;
    dueDate: string | null;
  };
}) {
  // The owner follows the project (its department manager); moving the request moves the owner.
  const [projectId, setProjectId] = useState(request.project.id);
  const team = useProjectTeam(projectId);
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <AP_Field label="Title" className="sm:col-span-6">
        <AP_Input name="title" required maxLength={200} defaultValue={request.title} />
      </AP_Field>
      <AP_Field label="Description" className="sm:col-span-6">
        <AP_Textarea name="description" rows={3} defaultValue={request.description ?? ""} />
      </AP_Field>
      <AP_Field label="Project" className="sm:col-span-3">
        <AP_Select name="project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} – {p.name}
            </option>
          ))}
        </AP_Select>
      </AP_Field>
      <div className="sm:col-span-3">
        <AP_OwnerField team={team.data} loading={team.isLoading} fallback={request.owner?.name ?? "No owner"} />
      </div>
      <AP_Field label="Type" className="sm:col-span-2">
        <AP_Select name="type" defaultValue={request.type}>
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>
              {REQUEST_TYPE_LABELS[t]}
            </option>
          ))}
        </AP_Select>
      </AP_Field>
      <AP_Field label="Priority" className="sm:col-span-2">
        <AP_Select name="priority" defaultValue={request.priority}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </AP_Select>
      </AP_Field>
      <AP_Field label="Due date" className="sm:col-span-2">
        <AP_Input name="dueDate" type="date" defaultValue={toDateInput(request.dueDate)} />
      </AP_Field>
    </div>
  );
}
