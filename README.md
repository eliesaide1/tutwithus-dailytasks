# TutWithUs Team Portal

Internal portal for the TutWithUs team: accounts, org chart, teams, weekly tasks and a live schedule.

Two separate projects:

| Folder | Stack | Dev URL |
|---|---|---|
| [`backend/`](backend) | Node.js, Express 5, MongoDB (Mongoose 8), JWT cookie auth, zod | http://localhost:4000 |
| [`frontend/`](frontend) | React 19, Vite 6, React Router 7, TanStack Query, Tailwind CSS 4 | http://localhost:5173 |

## Quick start

Requirements: Node.js 22+ and MongoDB 6+ running locally (the Windows "MongoDB" service on port 27017 works as-is).

```bash
# 1) API
cd backend
npm install
cp .env.example .env            # set JWT_SECRET (command in the file)
npm run seed                    # loads the team, schedule and sample tasks
npm run dev                     # http://localhost:4000

# 2) Web app (second terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173  (proxies /api to :4000)
```

Every seeded account uses the temporary password `TutWithUs!2026`. You must change it at first sign-in. To wipe and re-seed this app's database only: `npm run seed -- --reset`.

| Person | Email | Title | Access |
|---|---|---|---|
| Charbel Najm | charbel@tutwithus.com | CEO | Admin |
| Gabriel Sabbagh | gabriel@tutwithus.com | Project Leader | Admin |
| Elie Saide | elie@tutwithus.com | CTO | Admin |
| Thiago | thiago@tutwithus.com | Social Media & Marketing Manager | Member |
| Silvana Haddad | silvana@tutwithus.com | COO (Chief Operating Officer) | Member |
| Rodolphe Najm | rodolphe@tutwithus.com | Cross-department Support | Member |
| Theresa Ghanem | theresa@tutwithus.com | Content Creator (reports to Thiago) | Member |

Availability, recurring meetings, capacity and responsibilities are loaded from *Team Work Schedule v9 (1 Oct 2026)*. Titles are editable in the app.

## Features

| Area | Page | What it does |
|---|---|---|
| Dashboard | `/` | My open, due, overdue and blocked tasks; upcoming meetings in my time zone; announcements; activity; team overview for managers |
| My week | `/my-week` | Weekly task board per person (Mon→Sun, overdue, planned with no due day), estimate vs capacity. Anyone can view anyone's week |
| Tasks | `/tasks` | Tree view grouped by project, person or status (Project → Request → Tasks), with waiting-info and waiting-prerequisite counters and age or remaining time |
| Request detail | `/tasks/:number` | Status, priority, owner, tasks (assignee, estimate, due, planned week, blocker), comments, history |
| Workload | `/workload` | Capacity − meetings − planned tasks per person per week |
| Org chart | `/org-chart` | Interactive tree with search, depth, zoom/pan, team filter and print/export |
| Directory / profiles | `/people` | Contact info, local time, manager and reports, responsibilities, availability |
| Teams | `/teams` | Departments with lead, members and a mini org chart |
| Schedule | `/schedule` | Live week calendar, team availability, meetings with RSVP, "Find a time", `.ics` export. DST-aware time zone conversion |
| Announcements | `/announcements` | Pinned team news with optional notify-all |
| Notifications | `/notifications` | Assignment, comment and meeting notifications |
| Done report | `/admin/reports` | Admins only: every task completed this week, last week, this month, last month or between two dates, by person and by project, with hours and on-time rate. Export to Excel (CSV) or print |
| Admin | `/admin/*` | Users and access (create accounts, reset passwords, roles), projects, activity log |

### Roles

- **Admin** (Charbel Najm – CEO, Elie Saide – CTO, Gabriel Sabbagh – Project Leader): the only people who can create, edit, reassign or delete requests and tasks, manage projects, add or remove user accounts, see **all** tasks and everyone's week and workload, and read the activity log.
- **Member** (everyone else): sees only their own tasks (and requests they own), updates the status of tasks assigned to them, and comments. Cannot create or edit tasks.
- **Manager** (optional role, unused): can manage meetings, teams and announcements, but for tasks is the same as a member.

## Production

Two deployment options:

1. **One server** (simplest). Run `npm run build` in `frontend/`, then `npm run build && npm start` in `backend/` with `NODE_ENV=production`. The API serves `frontend/dist` on the same origin.
2. **Separate hosting.** Deploy `frontend/dist` to any static host with `VITE_API_URL=https://api.example.com` set at build time. Set `APP_ORIGINS` on the backend to the frontend's origin. Keep both on the same site (e.g. `portal.tutwithus.com` + `api.tutwithus.com`) so the `SameSite=Lax` session cookie is sent.

Other notes:

- **MongoDB**: use MongoDB Atlas or a managed replica set; set `MONGODB_URI`.
- **Secrets**: `JWT_SECRET` must be long, random and unique per environment.

## Project layout

The backend uses four layers. Each one only depends on the ones listed before it.

| Layer | Folder | Responsibility |
|---|---|---|
| Model | `backend/src/Model/` | MongoDB collections: one Mongoose schema per entity (User, Department, Project, Request, Task, Meeting, Availability…) |
| Infrastructure | `backend/src/Infrastructure/` | Technical plumbing: `Config/` (env), `Database/` (MongoDB connection), `Security/` (JWT session, password hashing), `Seed/` (sample data) |
| Application | `backend/src/Application/` | Business logic as services per feature (`Auth/`, `Core/`, `Tasks/`, `People/`, `Schedule/`), plus `Common/` (errors, validation, permissions, activity log) and `Shared/` (time zones, constants) |
| Controller | `backend/src/Controller/` | HTTP layer: one Express controller per feature (`AuthController`, `CoreController`, `TasksController`, `PeopleController`, `ScheduleController`), `Middleware/` (auth, CSRF, error handling) and `app.ts` |

A request flows Controller → Application service → Model. Controllers only read the request and send the response. Services validate input, check permissions and contain the rules.

### Frontend: calling the backend

Every API call goes through `frontend/src/Shared/SharedService.ts`, which has one function per endpoint (`LoginService`, `GetTaskTree`, `CreateMeeting`…). They all use `SharedService.ClientProxy`, which:

- sends the session cookie and the CSRF header;
- when the backend returns an error, opens the app-wide alert (`AP_AlertHost` / `AP_Alert`) with the backend's message and a title (e.g. "Not allowed", "Please check"), then throws an `ApiError` so the screen stops;
- on an expired session, alerts once and returns to the sign-in page.

Screens never call `fetch` directly and don't render API errors themselves.

```
backend/src/
  index.ts             entry point: connect to MongoDB, start Express
  Model/
  Infrastructure/
  Application/
  Controller/
frontend/src/
  main.tsx             entry: React Query, router, <AP_AlertHost />
  router.tsx           every screen and its URL
  Shared/              SharedService.ts (all backend calls + error alert), Types.ts (API types),
                       SharedFunctions.ts, Navigation.ts, time/constants/format helpers
  components/          every UI element, one file each, prefixed AP_ (AP_Button, AP_Alert, AP_OrgChart…)
  screens/             one folder per screen: <name>-screen/<name>-screen.tsx
  hooks/               useAlert, useAuth, data hooks (useTasks, usePeople, useSchedule…)
```
