// Shared helpers for the People feature: reporting-line checks, time zones, org chart rows.
import { Department, User } from "../../Model";

/**
 * True if making `managerId` the manager of `userId` would create a cycle
 * (the user themselves, or anyone below them in the chart).
 */
export async function wouldCreateCycle(userId: string, managerId: string | null) {
  if (!managerId) return false;
  if (managerId === userId) return true;
  const all = await User.find().select("manager").lean();
  const managerOf = new Map(all.map((u) => [String(u._id), u.manager ? String(u.manager) : null]));
  const seen = new Set<string>();
  let cur: string | null | undefined = managerId;
  while (cur && !seen.has(cur)) {
    if (cur === userId) return true;
    seen.add(cur);
    cur = managerOf.get(cur);
  }
  return false;
}

export function validZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export type OrgPerson = {
  id: string;
  name: string;
  title: string;
  avatarUrl: string | null;
  managerId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentColor: string | null;
};

/** Active people shaped for the org chart. */
export async function loadOrgPeople(filter: { department?: string } = {}): Promise<OrgPerson[]> {
  const [users, depts] = await Promise.all([
    User.find({ active: true, ...filter }).sort({ name: 1 }).select("name title avatarUrl manager department").lean(),
    Department.find().select("name color").lean(),
  ]);
  const deptById = new Map(depts.map((d) => [String(d._id), d]));
  return users.map((u) => {
    const d = u.department ? deptById.get(String(u.department)) : undefined;
    return {
      id: String(u._id),
      name: u.name,
      title: u.title,
      avatarUrl: u.avatarUrl ?? null,
      managerId: u.manager ? String(u.manager) : null,
      departmentId: u.department ? String(u.department) : null,
      departmentName: d?.name ?? null,
      departmentColor: d?.color ?? null,
    };
  });
}

export const departmentList = () => Department.find().sort({ order: 1, name: 1 }).select("name color").lean();
export const deptJson = (d: { _id: unknown; name: string; color: string }) => ({ id: String(d._id), name: d.name, color: d.color });
