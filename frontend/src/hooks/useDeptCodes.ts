import { useLookups } from "./useLookups";

/**
 * The 3-letter code(s) of the project(s) each department owns
 * (Technology → DEV, Marketing & Content → MKT, PMO → PMO …).
 */
export function useDeptCodes() {
  const { projects } = useLookups();
  const codesOf = (departmentId: string | null | undefined) =>
    departmentId ? projects.filter((p) => p.department === departmentId && !p.archived).map((p) => p.code) : [];
  /** "Technology (DEV)" for <option> labels. */
  const labelOf = (name: string, departmentId: string | null | undefined) => {
    const codes = codesOf(departmentId);
    return codes.length ? `${name} (${codes.join(", ")})` : name;
  };
  return { codesOf, labelOf };
}
