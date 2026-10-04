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
| Request phases | `/tasks` | Expanding a request shows its workflow: **Acceptance** → **Development analysis** → **Solution development**. See [Request workflow](#request-workflow) |
| Attachments | `/tasks` | PDFs, Office documents, images, text and zips on any task. Uploaded straight from the browser to object storage |
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

## Request workflow

Expanding a request in the tree shows three phases underneath it. Each is **activated**
first (a red check marks it live), then filled in, then closed with an action. A phase
stays locked until the one before it is done — enforced on the server, not just hidden in
the UI.

| Phase | Fields | Actions |
|---|---|---|
| **Acceptance** | *Accept this as* (New request / Bug / Support) and *Type* (Enhancement / Support / Fix / Content / Other). Accept stays disabled until both are set | Accept · Cancel |
| **Development analysis** | Opening date (today, fixed), delivery date, analysis hours and development hours — shown as days at 8 h = 1 day | Finalize · Cancel |
| **Solution development** | — | Launch QA · Finalize · Cancel |

The request's own status follows along: **In progress** when accepted, **Done** when
finalized, **Cancelled** from a cancel at any phase.

**Support is the exception.** Accepting as Support closes the request immediately — it is
handled with the client by email, so there is nothing to analyse or build, and both later
phases stay locked.

Admin-only, like every other change to a request.

## Attachments

Tasks can carry PDFs, Word/Excel/PowerPoint files, text, CSV, images and zips — up to
**25 MB each** and 20 per task, attachable from both the New request form and any existing
task.

The bytes never pass through the API. The browser asks for a short-lived presigned `PUT`,
uploads **straight to object storage**, then confirms; only the metadata reaches MongoDB.
That matters on a 512 MB instance — a 25 MB PDF would otherwise be buffered in the same
process that serves every request — and it keeps binaries out of a free-tier Atlas cluster.

Storage is optional: with no `SPACES_*` variables set, the attachment endpoints answer
`503` and the rest of the portal is unaffected.

Admins and the person a task is assigned to can attach and download; removal is limited to
admins and whoever uploaded the file. Deleting a task or request also deletes its objects.

### Setting up storage (DigitalOcean Spaces)

Any S3-compatible store works; Spaces is what production uses.

1. Create a bucket (e.g. `twtasks-files`), **File Listing: Restricted**, CDN off.
2. Add a **CORS rule**: your portal's origin, methods `GET` and `PUT`, allowed header `*`,
   max age `3600`. Without it the browser blocks the upload before it leaves the page.
3. Create a **Limited Access** key scoped to that bucket with Read/Write/Delete.
4. Set `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET`, `SPACES_REGION`.

The bucket's origin is added to the Content Security Policy automatically, derived from
`SPACES_BUCKET` and the endpoint — `connect-src` must allow it or the upload is blocked
with "Refused to connect".

### Roles

- **Admin** (Charbel Najm – CEO, Elie Saide – CTO, Gabriel Sabbagh – Project Leader): the only people who can create, edit, reassign or delete requests and tasks, manage projects, add or remove user accounts, see **all** tasks and everyone's week and workload, and read the activity log.
- **Member** (everyone else): sees only their own tasks (and requests they own), updates the status of tasks assigned to them, and comments. Cannot create or edit tasks.
- **Manager** (optional role, unused): can manage meetings, teams and announcements, but for tasks is the same as a member.

## Production

Two deployment options:

1. **One server** (simplest). Run `npm run build` in `frontend/`, then `npm run build && npm start` in `backend/` with `NODE_ENV=production`. The API serves `frontend/dist` on the same origin.
2. **Separate hosting.** Deploy `frontend/dist` to any static host with `VITE_API_URL=https://api.example.com` set at build time. Set `APP_ORIGINS` on the backend to the frontend's origin. Keep both on the same site (e.g. `portal.tutwithus.com` + `api.tutwithus.com`) so the `SameSite=Lax` session cookie is sent.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas or a managed replica set. Include the database name in the path, or writes land in `test` |
| `JWT_SECRET` | yes | 32+ characters, random, unique per environment. Changing it signs everyone out |
| `NODE_ENV` | — | `production` serves `frontend/dist` and marks the session cookie `Secure` |
| `PORT` | — | Defaults to 4000. Most hosts inject this themselves |
| `APP_ORIGINS` | — | Only for separate hosting (option 2 above) |
| `SPACES_KEY` / `SPACES_SECRET` / `SPACES_BUCKET` | — | Attachments. All three or none |
| `SPACES_REGION` | — | Defaults to `fra1` |
| `SPACES_ENDPOINT` | — | Derived from the region when unset |
| `MAX_ATTACHMENT_MB` | — | Defaults to 25 |

### Deploying (what production runs)

Root directory `backend`, then:

```bash
# Build
npm ci --include=dev && npm run build && cd ../frontend && npm ci --include=dev && npm run build
# Start
npm start
```

`--include=dev` is not optional: with `NODE_ENV=production` set, npm skips
devDependencies, and `esbuild`, `tsx`, `vite` and `typescript` all live there — the build
fails without it.

Other notes:

- **Atlas network access** must allow the host's outbound IP, or `0.0.0.0/0` where it is
  not static.
- **CAA records**, if your domain defines any, must authorise your host's certificate
  authorities (Render uses `letsencrypt.org` and `pki.goog`).

## Project layout

The backend uses four layers. Each one only depends on the ones listed before it.

| Layer | Folder | Responsibility |
|---|---|---|
| Model | `backend/src/Model/` | MongoDB collections: one Mongoose schema per entity (User, Department, Project, Request, Task, Meeting, Availability…) |
| Infrastructure | `backend/src/Infrastructure/` | Technical plumbing: `Config/` (env), `Database/` (MongoDB connection), `Security/` (JWT session, password hashing), `Storage/` (S3-compatible object storage for attachments), `Seed/` (sample data) |
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
  components/          every UI element, one file each, prefixed AP_ (AP_Button, AP_Alert, AP_OrgChart,
                       AP_RequestPhases, AP_Attachments…)
  screens/             one folder per screen: <name>-screen/<name>-screen.tsx
  hooks/               useAlert, useAuth, data hooks (useTasks, usePeople, useSchedule…)
```
