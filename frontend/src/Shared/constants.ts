// Enum-like values (SQLite has no enums). Keep labels and colors next to the values
// so every screen renders statuses the same way.

export const ROLES = ["ADMIN", "MANAGER", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
};

export const REQUEST_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_INFO",
  "WAITING_PREREQ",
  "DONE",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_INFO: "Waiting info",
  WAITING_PREREQ: "Waiting prerequisite",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const REQUEST_TYPES = ["TASK", "FEATURE", "BUG", "CONTENT", "SUPPORT"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  TASK: "Task",
  FEATURE: "Feature",
  BUG: "Bug",
  CONTENT: "Content",
  SUPPORT: "Support",
};

export const TASK_KINDS = [
  "General",
  "Analysis",
  "Development",
  "Design",
  "Content",
  "Marketing",
  "Sales",
  "Support",
  "Review",
] as const;

export const AVAILABILITY_KINDS = ["AVAILABLE", "WORK", "OFF", "UNSPECIFIED"] as const;
export type AvailabilityKind = (typeof AVAILABILITY_KINDS)[number];

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Display order for the work week (Monday first).
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const TIMEZONES = [
  "Asia/Beirut",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/Sao_Paulo",
  "America/New_York",
  "UTC",
];
