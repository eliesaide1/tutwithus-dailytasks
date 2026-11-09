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

/**
 * Attaching a file to a task, and opening one: admins, the person the task is assigned
 * to, and whoever raised it.
 *
 * The author is on the list because the files usually *are* the brief — the design, the
 * spreadsheet, the screenshot of what is wrong. Raising a task for somebody else is open
 * to everyone, so leaving them out meant only the three admins could attach the document
 * the task was about, and the refusal arrived after the task had already been created.
 *
 * Deliberately not canEditTask: the author may hand over the material, not move the work
 * forward. Changing a task's status stays with the person holding it and the admins.
 */
export function canAttachToTask(u: Who, task: { assignee?: Ref; createdBy?: Ref }) {
  return canManageTasks(u) || sameId(task.assignee, idOf(u)) || sameId(task.createdBy, idOf(u));
}

/** Editing a request (fields, status, adding tasks, deleting) is admin-only. */
export function canEditRequest(u: Who, _request?: unknown) {
  return canManageTasks(u);
}

/** The flags the client uses to show/hide UI. */
export function permissionsOf(u: Who) {
  return { isAdmin: isAdmin(u), isManager: isManager(u), canSeeAllTasks: canSeeAllTasks(u), canManageTasks: canManageTasks(u) };
}
