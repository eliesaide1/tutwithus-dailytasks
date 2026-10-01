import type { Types } from "mongoose";
import { Activity, Announcement, Comment, Counter, Notification, Project, Request, Task } from "../../Model";
import type { People } from "./people";

const DAY = 86_400_000;

// Dates relative to the current week so the demo always looks "live".
function weekStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY);
}

export async function seedWork(p: People) {
  const monday = weekStart();
  const nextMonday = new Date(monday.getTime() + 7 * DAY);
  const day = (n: number) => new Date(monday.getTime() + n * DAY); // 0 = Monday
  const ago = (days: number) => new Date(Date.now() - days * DAY);

  const [web, mkt, sal, ops, mgt] = await Project.insertMany([
    { code: "DEV", name: "Development & Platform", color: "#0891b2", department: p.depts.technology._id, description: "Website, app and platform development, infrastructure and this portal." },
    { code: "MKT", name: "Marketing & Social Media", color: "#f5bd1f", department: p.depts.marketing._id, description: "Marketing calendar, campaigns, content and reports." },
    { code: "SAL", name: "Sales & Partnerships", color: "#dc2626", department: p.depts.leadership._id, description: "B2B deals, schools, partnerships and pricing (incl. prerecorded B2B sessions)." },
    { code: "OPS", name: "Tutors & Clients", color: "#059669", department: p.depts.support._id, description: "Tutor onboarding, client follow-up and support cases." },
    { code: "PMO", name: "Planning & Coordination", color: "#7c3aed", department: p.depts.operations._id, description: "Scheduling, priorities, follow-ups and meeting actions." },
  ]);

  type Id = Types.ObjectId;
  type T = { title: string; kind: string; assignee: Id; status?: string; estimateMins?: number; dueDate?: Date; plannedWeek?: Date; blocker?: string };
  type R = {
    project: Id;
    title: string;
    description?: string;
    type: string;
    priority: string;
    status: string;
    owner: Id;
    createdBy: Id;
    dueDate?: Date;
    createdAt: Date;
    tasks: T[];
  };

  const requests: R[] = [
    {
      project: web!._id,
      title: "Website content updates for October",
      description: "Bring course listings, tutor profiles and the homepage up to date in the website CMS for the October campaign.",
      type: "FEATURE",
      priority: "HIGH",
      status: "IN_PROGRESS",
      owner: p.elie._id,
      createdBy: p.gabriel._id,
      dueDate: day(11),
      createdAt: ago(6),
      tasks: [
        { title: "Solution analysis: list pages and listings that need updating", kind: "Analysis", assignee: p.elie._id, status: "DONE", estimateMins: 120, plannedWeek: monday },
        { title: "Solution development: update homepage and course listings", kind: "Development", assignee: p.elie._id, status: "IN_PROGRESS", estimateMins: 360, dueDate: day(4), plannedWeek: monday },
        { title: "Review tutor profiles before publishing", kind: "Review", assignee: p.silvana._id, estimateMins: 60, dueDate: day(9), plannedWeek: nextMonday },
      ],
    },
    {
      project: web!._id,
      title: "Frontend performance and reliability audit",
      type: "TASK",
      priority: "MEDIUM",
      status: "OPEN",
      owner: p.elie._id,
      createdBy: p.elie._id,
      dueDate: day(12),
      createdAt: ago(3),
      tasks: [
        { title: "Measure Core Web Vitals on home, courses and teachers pages", kind: "Analysis", assignee: p.elie._id, estimateMins: 90, dueDate: day(5), plannedWeek: monday },
        { title: "Optimise teacher images and lazy-load the directory", kind: "Development", assignee: p.elie._id, estimateMins: 180, plannedWeek: nextMonday },
      ],
    },
    {
      project: web!._id,
      title: "Redesign the free-session booking flow",
      description: "UI/UX priority. Needs clear requirements on which fields sales needs before WhatsApp hand-off.",
      type: "FEATURE",
      priority: "MEDIUM",
      status: "WAITING_INFO",
      owner: p.elie._id,
      createdBy: p.charbel._id,
      createdAt: ago(12),
      tasks: [
        { title: "Collect booking-form requirements from sales", kind: "Analysis", assignee: p.thiago._id, status: "BLOCKED", blocker: "Waiting for sales decision at Saturday meeting", plannedWeek: monday },
      ],
    },
    {
      project: mkt!._id,
      title: "October marketing calendar",
      type: "CONTENT",
      priority: "HIGH",
      status: "IN_PROGRESS",
      owner: p.thiago._id,
      createdBy: p.gabriel._id,
      dueDate: day(2),
      createdAt: ago(8),
      tasks: [
        { title: "Draft the October posting calendar", kind: "Marketing", assignee: p.thiago._id, status: "DONE", estimateMins: 180, plannedWeek: monday },
        { title: "Create week 1 posts (Instagram, LinkedIn, X)", kind: "Content", assignee: p.thiago._id, status: "IN_PROGRESS", estimateMins: 480, dueDate: day(3), plannedWeek: monday },
        { title: "Approve calendar themes", kind: "Review", assignee: p.charbel._id, estimateMins: 30, dueDate: day(5), plannedWeek: monday },
      ],
    },
    {
      project: mkt!._id,
      title: "September monthly marketing report",
      type: "CONTENT",
      priority: "MEDIUM",
      status: "OPEN",
      owner: p.thiago._id,
      createdBy: p.gabriel._id,
      dueDate: day(4),
      createdAt: ago(2),
      tasks: [{ title: "Compile reach, leads and conversion figures", kind: "Marketing", assignee: p.thiago._id, estimateMins: 240, dueDate: day(4), plannedWeek: monday }],
    },
    {
      project: sal!._id,
      title: "Prerecorded B2B sessions",
      description: "Package prerecorded sessions for schools and companies.",
      type: "FEATURE",
      priority: "HIGH",
      status: "WAITING_PREREQ",
      owner: p.charbel._id,
      createdBy: p.charbel._id,
      dueDate: day(18),
      createdAt: ago(25),
      tasks: [
        { title: "Define the B2B package and pricing", kind: "Sales", assignee: p.charbel._id, status: "IN_PROGRESS", estimateMins: 180, dueDate: day(5), plannedWeek: monday },
        { title: "Record a pilot session", kind: "Content", assignee: p.rodolphe._id, estimateMins: 120, plannedWeek: nextMonday, blocker: "Needs the package definition first" },
      ],
    },
    {
      project: ops!._id,
      title: "October tutor and client follow-up",
      type: "SUPPORT",
      priority: "HIGH",
      status: "IN_PROGRESS",
      owner: p.silvana._id,
      createdBy: p.gabriel._id,
      createdAt: ago(5),
      dueDate: day(6),
      tasks: [
        { title: "Follow up open client cases", kind: "Support", assignee: p.silvana._id, status: "IN_PROGRESS", estimateMins: 180, dueDate: day(1), plannedWeek: monday },
        { title: "Onboard three new tutors", kind: "Support", assignee: p.silvana._id, estimateMins: 240, dueDate: day(6), plannedWeek: monday },
      ],
    },
    {
      project: mgt!._id,
      title: "Agree Rodolphe's two-week priorities",
      description: "No two-week priorities were supplied. Agree two or three concrete deliverables, owners supported and due dates at the Saturday team meeting.",
      type: "TASK",
      priority: "MEDIUM",
      status: "OPEN",
      owner: p.gabriel._id,
      createdBy: p.gabriel._id,
      dueDate: day(5),
      createdAt: ago(1),
      tasks: [
        { title: "Propose 2-3 deliverables for Saturday", kind: "General", assignee: p.rodolphe._id, estimateMins: 60, dueDate: day(5), plannedWeek: monday },
        { title: "Confirm Saturday 13:00 team-meeting slot", kind: "General", assignee: p.silvana._id, estimateMins: 5, dueDate: day(4), plannedWeek: monday },
      ],
    },
    {
      project: mgt!._id,
      title: "Recheck schedule before Beirut DST change (25 Oct)",
      description: "Beirut and Saudi local times stop aligning on 25 October. The portal converts meeting times automatically; confirm everyone's windows still work.",
      type: "TASK",
      priority: "LOW",
      status: "OPEN",
      owner: p.gabriel._id,
      createdBy: p.gabriel._id,
      dueDate: day(18),
      createdAt: ago(0.5),
      tasks: [{ title: "Review meeting slots for the new offset", kind: "General", assignee: p.gabriel._id, estimateMins: 30, plannedWeek: nextMonday }],
    },
  ];

  let number = 0;
  let firstId: Types.ObjectId | null = null;
  for (const r of requests) {
    const { tasks, ...data } = r;
    number += 1;
    const created = await Request.create({ ...data, number });
    firstId ??= created._id;
    await Task.insertMany(
      tasks.map((task, i) => ({
        ...task,
        request: created._id,
        order: i,
        createdBy: r.createdBy,
        completedAt: task.status === "DONE" ? ago(1) : null,
      })),
    );
    await Activity.create({
      actor: r.createdBy,
      entity: "Request",
      entityId: String(number),
      action: "created",
      summary: `created request #${number} "${created.title}"`,
      link: `/tasks/${number}`,
      createdAt: r.createdAt,
    });
  }
  await Counter.findOneAndUpdate({ _id: "request" }, { seq: number }, { upsert: true });

  await Comment.insertMany([
    { request: firstId, author: p.gabriel._id, body: "Priority for this sprint: the October campaign links to these pages.", createdAt: ago(5) },
    { request: firstId, author: p.elie._id, body: "Homepage is done. Course listings next, then tutor profiles.", createdAt: ago(1) },
  ]);

  await Announcement.insertMany([
    {
      title: "Welcome to the TutWithUs team portal",
      body: "Tasks, schedules and the org chart now live here instead of PDFs. Please change your password on first sign-in, check your availability on the Schedule page and keep your tasks up to date before each meeting.",
      pinned: true,
      author: p.gabriel._id,
    },
    {
      title: "Time zones: Beirut changes on 25 October",
      body: "From 25 October, Beirut is one hour behind Saudi Arabia. The Schedule page converts every meeting to your own time zone automatically.",
      author: p.elie._id,
    },
  ]);

  await Notification.insertMany([
    { user: p.elie._id, title: "Gabriel commented on #1", body: "Priority for this sprint…", link: "/tasks/1" },
    { user: p.silvana._id, title: "Please confirm the Saturday 13:00 team meeting", link: "/schedule?tab=meetings" },
  ]);
}
