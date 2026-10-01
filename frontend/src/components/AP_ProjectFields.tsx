import type { ProjectRow } from "@/Shared/Types";
import { AP_Checkbox } from "./AP_Checkbox";
import { AP_Field } from "./AP_Field";
import { AP_Input } from "./AP_Input";
import { AP_Select } from "./AP_Select";
import { AP_Textarea } from "./AP_Textarea";

/** Fields for creating or editing a project. */
export function AP_ProjectFields({ departments, project }: { departments: { id: string; name: string }[]; project?: ProjectRow }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <AP_Field label="Code" hint="2-8 letters, e.g. DEV" className="sm:col-span-1">
        <AP_Input name="code" required maxLength={8} defaultValue={project?.code} className="uppercase" />
      </AP_Field>
      <AP_Field label="Name" className="sm:col-span-3">
        <AP_Input name="name" required maxLength={100} defaultValue={project?.name} />
      </AP_Field>
      <AP_Field label="Color" className="sm:col-span-1">
        <AP_Input name="color" type="color" defaultValue={project?.color ?? "#0b3b8c"} className="h-9.5 p-1" />
      </AP_Field>
      <AP_Field label="Team" className="sm:col-span-1">
        <AP_Select name="department" defaultValue={project?.department?.id ?? ""}>
          <option value="">None</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </AP_Select>
      </AP_Field>
      <AP_Field label="Description" className="sm:col-span-6">
        <AP_Textarea name="description" rows={2} className="min-h-0" defaultValue={project?.description ?? ""} />
      </AP_Field>
      {project && (
        <div className="sm:col-span-6">
          <AP_Checkbox name="archived" label="Archived (hidden when creating requests)" defaultChecked={project.archived} />
        </div>
      )}
    </div>
  );
}
