// Shapes of the data the backend sends and receives. One place for every API type.

// ───────────────────────────── Auth ─────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  title: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  avatarUrl: string | null;
  timezone: string;
  mustChangePassword: boolean;
  department: string | null;
  permissions: { isAdmin: boolean; isManager: boolean; canSeeAllTasks: boolean; canManageTasks: boolean };
};

export type LoginCredentials = { email: string; password: string };
export type ChangePasswordRequest = { current: string; next: string; confirm: string };

// ───────────────────────────── Lookups ─────────────────────────────

export type LookupUser = {
  id: string;
  name: string;
  title: string;
  avatarUrl?: string | null;
  timezone: string;
  department: string | null;
  manager: string | null;
  role: string;
  weeklyCapacityMins: number;
};
export type LookupDepartment = { id: string; name: string; color: string; lead: string | null; order: number };
export type LookupProject = { id: string; code: string; name: string; color: string; archived: boolean; department: string | null };
export type Lookups = { users: LookupUser[]; departments: LookupDepartment[]; projects: LookupProject[] };

// ───────────────────────────── Dashboard, activity, notifications ─────────────────────────────

export type ActivityRow = {
  id: string;
  summary: string;
  link: string | null;
  entity: string;
  createdAt: string;
  actor: { name: string; avatarUrl: string | null } | null;
};

export type Dashboard = {
  stats: { open: number; dueThisWeek: number; overdue: number; blocked: number };
  tasks: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    request: { number: number; title: string; priority: string; project: { code: string; color: string } };
  }[];
  meetings: { id: string; title: string; start: string; time: string; day: string; attendees: { id: string; name: string; avatarUrl: string | null }[] }[];
  announcements: { id: string; title: string; body: string; pinned: boolean; createdAt: string; author: string | null }[];
  activity: ActivityRow[];
  team: { id: string; name: string; title: string; avatarUrl: string | null; open: number; overdue: number; blocked: number }[];
};

export type NotificationItem = { id: string; title: string; body?: string; link?: string; read: boolean; createdAt: string };

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: { name: string; avatarUrl?: string | null } | null;
};
export type AnnouncementInput = { title: string; body: string; pinned?: boolean; notifyAll?: boolean };

export type WorkloadRow = {
  id: string;
  name: string;
  title: string;
  avatarUrl: string | null;
  capacityMins: number;
  meetingMins: number;
  plannedMins: number;
  doneMins: number;
  unestimated: number;
  remainingMins: number;
};
export type Workload = { weekStart: string; rows: WorkloadRow[] };

// ───────────────────────────── Tasks ─────────────────────────────

export type UserLite = { id: string; name: string; avatarUrl: string | null; title?: string };
export type ProjectLite = { id: string; code: string; name: string; color: string };

export type RequestSummary = {
  id: string;
  number: number;
  title: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string | null;
  closedAt: string | null;
  createdAt: string;
  project: ProjectLite;
  owner: UserLite | null;
};

export type TreeRequest = RequestSummary & {
  tasks: { id: string; title: string; status: string; dueDate: string | null; assignee: UserLite | null }[];
};
export type TaskTree = { scope?: "all" | "mine"; waitingInfo: number; waitingPrereq: number; requests: TreeRequest[] };

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  status: string;
  estimateMins: number | null;
  dueDate: string | null;
  plannedWeek: string | null;
  blocker: string | null;
  order: number;
  completedAt: string | null;
  createdAt: string;
  assignee: UserLite | null;
  attachments: Attachment[];
  canEdit: boolean; // may change the status
  canManage?: boolean; // may edit details / delete (admins only)
};

/** One file attached to a task. The bytes live in object storage, not in MongoDB. */
export type Attachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedBy: string | null;
  uploadedAt: string | null;
};

export type RequestDetail = RequestSummary & {
  description: string | null;
  createdBy: UserLite | null;
  canEdit: boolean;
  /** true when the viewer only sees their own tasks in this request */
  partial?: boolean;
  /** Admins and the request's owner (the department manager) may reassign its tasks. */
  canAssign?: boolean;
  tasks: TaskItem[];
  comments: { id: string; body: string; createdAt: string; author: UserLite | null }[];
};
export type RequestActivity = { id: string; summary: string; createdAt: string; actor: { name: string } | null };
export type RequestResponse = { request: RequestDetail; activity: RequestActivity[] };

export type WeekTask = TaskItem & {
  request: { number: number; title: string; project: { code: string; color: string } };
};

export type MyWeek = {
  person: { id: string; name: string; title: string; avatarUrl: string | null; timezone: string; weeklyCapacityMins: number };
  weekStart: string;
  currentWeek: string;
  isCurrentWeek: boolean;
  today: string;
  tasks: WeekTask[];
  overdue: WeekTask[];
};

/** A project's department manager (owner of its requests) and who its tasks may go to. */
export type TeamPerson = { id: string; name: string; title: string; avatarUrl: string | null };
export type ProjectTeam = { lead: TeamPerson | null; department: { id: string; name: string } | null; members: TeamPerson[] };

export type ProjectRow = ProjectLite & {
  description: string | null;
  archived: boolean;
  department: { id: string; name: string } | null;
  openRequests: number;
  totalRequests: number;
};

// ───────────────────────────── People ─────────────────────────────

export type DeptRef = { id: string; name: string; color: string };
export type PersonRef = { id: string; name: string; title: string; avatarUrl?: string | null };

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

export type DirectoryPerson = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  timezone: string;
  department: DeptRef | null;
  manager: { id: string; name: string } | null;
};

export type Person = {
  id: string;
  email: string;
  name: string;
  title: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  avatarUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  bio?: string | null;
  responsibilities?: string | null;
  urgentContact?: string | null;
  timezone: string;
  weeklyCapacityMins: number;
  active: boolean;
  mustChangePassword: boolean;
  validUntil?: string | null;
  lastLoginAt?: string | null;
};

export type ProfileResponse = {
  person: Person & { department: DeptRef | null; manager: PersonRef | null };
  reports: PersonRef[];
  availability: { id: string; dayOfWeek: number; startMinute: number; endMinute: number; kind: string; note?: string | null }[];
  stats: { openTasks: number; overdueTasks: number } | null; // null: not visible to this viewer
  canEdit: boolean;
};

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  order: number;
  lead: string | null;
};

export type TeamsResponse = {
  unassigned: number;
  teams: (Omit<Team, "lead"> & {
    lead: PersonRef | null;
    members: { id: string; name: string; avatarUrl: string | null }[];
    openTasks: number | null;
  })[];
};

export type TeamResponse = {
  team: Team;
  members: OrgPerson[];
  openTasks: Record<string, number> | null;
  projects: { id: string; code: string; name: string; color: string }[];
  others: { id: string; name: string; department: { id: string; name: string } | null }[];
  counts: { members: number; projects: number };
};

export type AdminUser = Person & { department: { id: string; name: string } | null; manager?: string | null };
export type AccountUser = Person & { department: string | null; manager: string | null };
export type CreatedAccount = { user: AdminUser; tempPassword: string };

// ───────────────────────────── Schedule ─────────────────────────────

export type Segment = { column: number; start: number; end: number };

export type Attendee = { userId: string; name: string; timezone: string; avatarUrl: string | null; status: string };

export type Meeting = {
  id: string;
  title: string;
  purpose: string | null;
  agenda: string | null;
  location: string | null;
  recurrence: "WEEKLY" | "ONCE";
  dayOfWeek: number | null;
  date: string | null;
  startMinute: number;
  endMinute: number;
  timezone: string;
  validFrom: string | null;
  validUntil: string | null;
  organizerId: string | null;
  attendees: Attendee[];
};

export type Conflict = { name: string; local: string };

export type ScheduleMeeting = Meeting & {
  occurrence: { start: string; end: string; local: string } | null;
  conflicts: Conflict[];
};

export type Occurrence = {
  meetingId: string;
  start: string;
  end: string;
  segments: Segment[];
  attendeeTimes: { userId: string; name: string; zone: string; label: string; status: string }[];
  mismatch: boolean;
};

export type DayCell = {
  windows: { start: number; end: number; kind: string; note: string | null }[];
  markers: { kind: string; note: string | null }[];
  meetings: { id: string; title: string; start: number; end: number; status: string }[];
};

export type SchedulePerson = { id: string; name: string; title: string; avatarUrl: string | null; timezone: string };

export type AvailabilityRow = { person: SchedulePerson; days: DayCell[] };

export type ZoneOption = { value: string; label: string };

export type ScheduleData = {
  week: string;
  currentWeek: string;
  zone: string;
  zoneLabel: string;
  zones: ZoneOption[];
  todayColumn: number | null;
  occurrences: Occurrence[];
  rows: AvailabilityRow[];
  meetings: ScheduleMeeting[];
};

export type MeetingFormOptions = { people: SchedulePerson[]; zones: ZoneOption[] };
export type MeetingResponse = { meeting: Meeting; conflicts: Conflict[] };

export type AvailabilityWindow = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  kind: string;
  note?: string | null;
};

export type AvailabilityResponse = {
  user: { id: string; name: string; title: string; avatarUrl?: string | null; timezone: string };
  zoneLabel: string;
  windows: AvailabilityWindow[];
  team: { id: string; name: string }[];
};

/** Window as sent when saving availability (times as "HH:MM"). */
export type AvailabilityWindowInput = { dayOfWeek: number; kind: string; start?: string; end?: string; note?: string | null };

// ───────────────────────────── Reports ─────────────────────────────

export type CompletedTask = {
  id: string;
  title: string;
  kind: string;
  estimateMins: number | null;
  completedAt: string;
  dueDate: string | null;
  /** null when the task had no due date */
  onTime: boolean | null;
  assignee: { id: string; name: string; avatarUrl: string | null; title: string } | null;
  request: { number: number; title: string; project: { id: string; code: string; name: string; color: string } } | null;
};

export type CompletedReport = {
  from: string;
  to: string;
  timezone: string;
  total: number;
  estimateMins: number;
  onTime: number;
  late: number;
  byPerson: { person: CompletedTask["assignee"]; count: number; estimateMins: number; onTime: number; late: number }[];
  byProject: { project: NonNullable<CompletedTask["request"]>["project"]; count: number; estimateMins: number }[];
  tasks: CompletedTask[];
};
