// Pure permission checks shared by every module.
type Ref = { toString(): string } | string | null | undefined;
type Who = { id?: string; _id?: Ref; role: string };

const idOf = (u: Who) => String(u.id ?? u._id);
export const sameId = (a: Ref, b: Ref) => !!a && !!b && String(a) === String(b);

export const isAdmin = (u: Who) => u.role === "ADMIN";
export const isManager = (u: Who) => u.role === "ADMIN" || u.role === "MANAGER";

/**
 * Only admins (CEO, CTO, Project Leader) see and manage every task. Everyone else sees
 * requests they own or created, plus the tasks assigned to them.
 */
export const canSeeAllTasks = (u: Who) => isAdmin(u);

/**
 * Only admins (Charbel, Elie, Gabriel) create, edit, reassign or delete requests and
 * tasks, and manage projects. Nobody else, whatever their role.
 */
export const canManageTasks = (u: Who) => isAdmin(u);

/** Status updates: admins, or the person the task is assigned to. */
export function canEditTask(u: Who, task: { assignee?: Ref }) {
  return canManageTasks(u) || sameId(task.assignee, idOf(u));
}

/** Editing a request (fields, status, adding tasks, deleting) is admin-only. */
export function canEditRequest(u: Who, _request?: unknown) {
  return canManageTasks(u);
}

/** The flags the client uses to show/hide UI. */
export function permissionsOf(u: Who) {
  return { isAdmin: isAdmin(u), isManager: isManager(u), canSeeAllTasks: canSeeAllTasks(u), canManageTasks: canManageTasks(u) };
}
