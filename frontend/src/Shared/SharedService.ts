// SharedService: the only place the frontend talks to the backend.
//
// Every endpoint has a function below. They all go through SharedService.ClientProxy,
// which sends the session cookie + CSRF header and, when the backend answers with an
// error, shows it in the app-wide alert (<AP_AlertHost />) and throws an ApiError so
// the caller stops (React Query marks the query/mutation as failed).
import type {
  AccountUser,
  Attachment,
  ActivityRow,
  AdminUser,
  Announcement,
  AnnouncementInput,
  AvailabilityResponse,
  AvailabilityWindowInput,
  ChangePasswordRequest,
  CompletedReport,
  CreatedAccount,
  Dashboard,
  DeptRef,
  DirectoryPerson,
  LoginCredentials,
  Lookups,
  MeetingFormOptions,
  MeetingResponse,
  MyWeek,
  NotificationItem,
  OrgPerson,
  ProfileResponse,
  ProjectRow,
  ProjectTeam,
  RequestResponse,
  ScheduleData,
  SessionUser,
  Team,
  TeamResponse,
  TeamsResponse,
  TaskTree,
  Workload,
} from "./Types";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export type AlertButton = { title: string; press?: () => void; variant?: "primary" | "secondary" | "danger" };
type AlertHandler = (message: string, buttons?: AlertButton[], title?: string) => void;
type SessionHandler = (reason: "expired" | "password-change") => void;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | null | undefined>;
type ProxyOptions = {
  query?: Query;
  /** Don't show the alert for this call (background polling, session checks). */
  silent?: boolean;
};

let setAlert: AlertHandler = () => {};
let onSession: SessionHandler = () => {};
let handlingExpiredSession = false;

/** Heading shown above the backend's message, by HTTP status (or error code). */
function alertTitle(status: number, code?: string) {
  if (code === "BAD_CREDENTIALS") return "Sign-in failed";
  if (status === 0) return "Connection problem";
  if (status === 400) return "Please check";
  if (status === 401) return "Not signed in";
  if (status === 403) return "Not allowed";
  if (status === 404) return "Not found";
  if (status === 409) return "Already exists";
  if (status === 413) return "Too large";
  if (status === 429) return "Too many attempts";
  if (status >= 500) return "Server error";
  return "Something went wrong";
}

export function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}${path.includes("?") ? "&" : "?"}${s}` : path;
}

/** Absolute URL of an API path (for downloads such as the .ics calendar). */
export const apiUrl = (path: string) => `${BASE_URL}/api${path}`;

const SharedService = {
  /** <AP_AlertHost /> registers the function that opens the alert. */
  setAlertHandler(handler: AlertHandler) {
    setAlert = handler;
  },

  /** Called when the session expired (401) or a password change is required. */
  setSessionHandler(handler: SessionHandler) {
    onSession = handler;
  },

  showAlert(message: string, buttons?: AlertButton[], title?: string) {
    setAlert(message, buttons, title);
  },

  async ClientProxy<T>(endpoint: string, method: Method = "GET", data?: unknown, options: ProxyOptions = {}): Promise<T> {
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api${withQuery(endpoint, options.query)}`, {
        method,
        credentials: "include",
        headers: {
          "X-Requested-With": "twu",
          ...(data !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        },
        body: data === undefined ? undefined : isForm ? data : JSON.stringify(data),
      });
    } catch {
      const err = new ApiError(0, "Can't reach the server. Check your connection, or that the backend is running.");
      if (!options.silent) SharedService.showAlert(err.message, undefined, alertTitle(0));
      throw err;
    }

    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body as T;

    // The backend always answers errors with { error, code }. A 5xx without that shape
    // comes from a proxy/gateway in front of it: the backend itself is unreachable.
    if (!body.error && res.status >= 500) {
      const down = new ApiError(0, "Can't reach the server. Check your connection, or that the backend is running.");
      if (!options.silent) SharedService.showAlert(down.message, undefined, alertTitle(0));
      throw down;
    }
    const err = new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.code);
    const isAuthCall = endpoint.startsWith("/auth/");

    // Session expired: send the user back to sign in, once, with an explanation.
    if (res.status === 401 && !isAuthCall) {
      if (!handlingExpiredSession) {
        handlingExpiredSession = true;
        onSession("expired");
        SharedService.showAlert("Your session has expired. Please sign in again.", [
          { title: "OK", press: () => (handlingExpiredSession = false) },
        ]);
      }
      throw err;
    }
    // A temporary password must be changed first: the app redirects to /account.
    if (err.code === "PASSWORD_CHANGE_REQUIRED") {
      onSession("password-change");
      throw err;
    }

    if (!options.silent) SharedService.showAlert(err.message, undefined, alertTitle(res.status, err.code));
    throw err;
  },
};

export default SharedService;

const get = <T>(endpoint: string, options?: ProxyOptions) => SharedService.ClientProxy<T>(endpoint, "GET", undefined, options);
const post = <T>(endpoint: string, data: unknown = {}) => SharedService.ClientProxy<T>(endpoint, "POST", data);
const put = <T>(endpoint: string, data: unknown = {}) => SharedService.ClientProxy<T>(endpoint, "PUT", data);
const patch = <T>(endpoint: string, data: unknown = {}) => SharedService.ClientProxy<T>(endpoint, "PATCH", data);
const del = <T>(endpoint: string) => SharedService.ClientProxy<T>(endpoint, "DELETE");

type Body = Record<string, unknown>;
type Ok = { ok: true };

// ───────────────────────────── Login & account ─────────────────────────────

export const LoginService = (credentials: LoginCredentials) => post<{ user: SessionUser }>("/auth/login", credentials);

export const LogoutService = () => post<Ok>("/auth/logout");

/** The signed-in user, or null when signed out (no alert: being signed out is normal). */
export async function GetSessionUser() {
  try {
    return (await get<{ user: SessionUser }>("/auth/me", { silent: true })).user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export const ChangePasswordService = (request: ChangePasswordRequest) => post<{ user: SessionUser }>("/auth/change-password", request);

// ───────────────────────────── Dashboard & common lists ─────────────────────────────

export const GetLookups = () => get<Lookups>("/lookups");

export const GetDashboard = () => get<Dashboard>("/dashboard");

export const GetWorkload = (week: string) => get<Workload>("/workload", { query: { week } });

export const GetActivity = (filters: { entity?: string; user?: string }) =>
  get<{ items: ActivityRow[]; entities: string[] }>("/activity", { query: filters });

// ───────────────────────────── Notifications ─────────────────────────────

/** Polled in the header every minute, so it never pops an alert. */
export const GetUnreadCount = async () => (await get<{ count: number }>("/notifications/unread-count", { silent: true })).count;

export const GetNotifications = async () => (await get<{ items: NotificationItem[] }>("/notifications")).items;

export const MarkNotificationRead = (id: string) => post<{ item: NotificationItem }>(`/notifications/${id}/read`);

export const MarkAllNotificationsRead = () => post<Ok>("/notifications/read-all");

// ───────────────────────────── Announcements ─────────────────────────────

export const GetAnnouncements = async () => (await get<{ items: Announcement[] }>("/announcements")).items;

export const CreateAnnouncement = (input: AnnouncementInput | Body) => post<{ item: Announcement }>("/announcements", input);

export const ToggleAnnouncementPin = (id: string) => post<{ item: Announcement }>(`/announcements/${id}/pin`);

export const DeleteAnnouncement = (id: string) => del<Ok>(`/announcements/${id}`);

// ───────────────────────────── Tasks ─────────────────────────────

export const GetTaskTree = (params: { person: string; show: string; project: string }) => get<TaskTree>("/tasks", { query: params });

export const GetRequest = (number: string | number) => get<RequestResponse>(`/tasks/${number}`);

export const CreateRequest = (request: Body) => post<{ number: number }>("/tasks", request);

export const UpdateRequest = (number: number, request: Body) => patch<Ok>(`/tasks/${number}`, request);

export const SetRequestStatus = (number: number | string, status: string) => post<Ok>(`/tasks/${number}/status`, { status });

export const DeleteRequest = (number: number) => del<Ok>(`/tasks/${number}`);

export const AddTask = (number: number, task: Body) => post<{ id: string }>(`/tasks/${number}/tasks`, task);

export const UpdateTask = (id: string, task: Body) => patch<Ok>(`/task-items/${id}`, task);

export const SetTaskStatus = (id: string, status: string) => post<Ok>(`/task-items/${id}/status`, { status });

export const DeleteTask = (id: string) => del<Ok>(`/task-items/${id}`);

// ── Task attachments ──
//
// Uploads go straight from the browser to object storage with a presigned PUT, so a big
// PDF never passes through the API. Three steps: ask, upload, confirm.

type Presigned = { uploadUrl: string; key: string; contentType: string; expiresIn: number };

/** Upload one file to a task. `onProgress` gets 0..1 so the caller can show a bar. */
export async function UploadAttachment(taskId: string, file: File, onProgress?: (fraction: number) => void): Promise<Attachment> {
  const contentType = file.type || "application/octet-stream";
  const slot = await post<Presigned>(`/task-items/${taskId}/attachments/presign`, {
    filename: file.name,
    contentType,
    size: file.size,
  });

  // XHR rather than fetch: it reports upload progress, which fetch still cannot.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", slot.uploadUrl, true);
    xhr.setRequestHeader("Content-Type", slot.contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, "The file couldn't be uploaded. Please try again."));
    xhr.onerror = () => reject(new ApiError(0, "The file couldn't be uploaded. Check your connection."));
    xhr.send(file);
  }).catch((e: ApiError) => {
    SharedService.showAlert(e.message, undefined, "Upload failed");
    throw e;
  });

  onProgress?.(1);
  return post<Attachment>(`/task-items/${taskId}/attachments`, { key: slot.key, filename: file.name });
}

/** Opening this URL redirects to a short-lived storage link. */
export const AttachmentUrl = (taskId: string, fileId: string) => apiUrl(`/task-items/${taskId}/attachments/${fileId}`);

export const DeleteAttachment = (taskId: string, fileId: string) => del<Ok>(`/task-items/${taskId}/attachments/${fileId}`);

/** Hand a task to someone on the project's team (admins and the request's owner). */
export const AssignTask = (id: string, assignee: string) => post<Ok>(`/task-items/${id}/assign`, { assignee });

export const AddComment = (number: number, body: string) => post<Ok>(`/tasks/${number}/comments`, { body });

export const GetMyWeek = (user: string, week: string) => get<MyWeek>("/my-week", { query: { user, week } });

// ───────────────────────────── Projects ─────────────────────────────

/** The project's department manager (who owns its requests) and the people its tasks may go to. */
export const GetProjectTeam = (projectId: string) => get<ProjectTeam>(`/projects/${projectId}/team`);

export const GetProjects = async () => (await get<{ projects: ProjectRow[] }>("/projects")).projects;

export const CreateProject = (project: Body) => post<unknown>("/projects", project);

export const UpdateProject = (id: string, project: Body) => patch<unknown>(`/projects/${id}`, project);

export const DeleteProject = (id: string) => del<Ok>(`/projects/${id}`);

// ───────────────────────────── People & org chart ─────────────────────────────

export const GetDirectory = () => get<{ people: DirectoryPerson[]; departments: DeptRef[] }>("/people");

export const GetOrgChart = () => get<{ people: OrgPerson[]; departments: DeptRef[] }>("/org-chart");

export const GetProfile = (id: string) => get<ProfileResponse>(`/people/${id}`);

export const UpdateProfile = (id: string, profile: Body) => patch<unknown>(`/people/${id}`, profile);

// ───────────────────────────── Teams ─────────────────────────────

export const GetTeams = () => get<TeamsResponse>("/teams");

export const GetTeam = (id: string) => get<TeamResponse>(`/teams/${id}`);

export const CreateTeam = (team: Body) => post<{ team: Team }>("/teams", team);

export const UpdateTeam = (id: string, team: Body) => patch<{ team: Team }>(`/teams/${id}`, team);

export const DeleteTeam = (id: string) => del<Ok>(`/teams/${id}`);

export const AddTeamMember = (teamId: string, userId: string) => post<unknown>(`/teams/${teamId}/members`, { userId });

export const RemoveTeamMember = (teamId: string, userId: string) => del<unknown>(`/teams/${teamId}/members/${userId}`);

// ───────────────────────────── User accounts (admins) ─────────────────────────────

export const GetAdminUsers = () => get<{ users: AdminUser[] }>("/admin/users");

export const GetAdminUser = (id: string) => get<{ user: AccountUser }>(`/admin/users/${id}`);

export const CreateAdminUser = (account: Body) => post<CreatedAccount>("/admin/users", account);

export const UpdateAdminUser = (id: string, account: Body) => patch<unknown>(`/admin/users/${id}`, account);

export const ResetUserPassword = (id: string) => post<{ email: string; tempPassword: string }>(`/admin/users/${id}/reset-password`);

export const SetUserActive = (id: string, active: boolean) => post<{ message: string }>(`/admin/users/${id}/active`, { active });

// ───────────────────────────── Schedule ─────────────────────────────

export const GetSchedule = (week: string, tz: string) => get<ScheduleData>("/schedule", { query: { week, tz } });

export const GetMeetingFormOptions = () => get<MeetingFormOptions>("/meetings-form-options");

export const GetMeeting = (id: string) => get<MeetingResponse>(`/meetings/${id}`);

export const CreateMeeting = (meeting: Body) => post<{ id: string }>("/meetings", meeting);

export const UpdateMeeting = (id: string, meeting: Body) => put<{ id: string }>(`/meetings/${id}`, meeting);

export const DeleteMeeting = (id: string) => del<Ok>(`/meetings/${id}`);

export const RsvpMeeting = (id: string, status: string) => post<{ status: string }>(`/meetings/${id}/rsvp`, { status });

export const GetAvailability = (userId: string) => get<AvailabilityResponse>(`/availability/${userId}`);

export const SaveAvailability = (userId: string, windows: AvailabilityWindowInput[]) => put<Ok>(`/availability/${userId}`, { windows });

/** Download link for the signed-in user's meetings as an .ics calendar file. */
export const ScheduleCalendarUrl = () => apiUrl("/schedule/ics");

// ───────────────────────────── Reports (admins) ─────────────────────────────

/** Tasks completed between two calendar days (inclusive), in the viewer's time zone. */
export const GetCompletedReport = (from: string, to: string) => get<CompletedReport>("/reports/completed", { query: { from, to } });
