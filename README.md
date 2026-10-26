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
| Charbel Najm | c.najm@tutwithus.com | CEO | Admin |
| Gabriel Sabbagh | g.sabbagh@tutwithus.com | Project Leader | Admin |
| Elie Saide | e.saide@tutwithus.com | CTO | Admin |
| Thiago Vanderlei | t.vanderlei@tutwithus.com | Social Media & Marketing Manager | Member |
| Silvana Haddad | selhaddad@tutwithus.com | COO (Chief Operating Officer) | Member |
| Rodolphe Najm | r.najm@tutwithus.com | Cross-department Support | Member |
| Theresa Ghanem | t.ghanem@tutwithus.com | Content Creator (reports to Thiago) | Member |

The address is both the sign-in name and where [approval emails](#emails) land,
so there is only one per person and it has to be a real mailbox. **`t.ghanem@` does not
exist yet** — create it in the Titan panel or Theresa's approval emails bounce.

A database that predates this (`gabriel@`, `elie@`…) is moved across with **`npm run
migrate`** in `backend/`: it rewrites the sign-in addresses, leaves passwords alone, skips
anyone already moved, and is safe to run twice.

Availability, recurring meetings, capacity and responsibilities are loaded from *Team Work Schedule v9 (1 Oct 2026)*. Titles are editable in the app.

## Features

| Area | Page | What it does |
|---|---|---|
| Dashboard | `/` | My open, due, overdue and blocked tasks; upcoming meetings in my time zone; announcements; activity; team overview for managers |
| My week | `/my-week` | Weekly task board per person (Mon→Sun, overdue, planned with no due day), estimate vs capacity. Anyone can view anyone's week |
| Tasks | `/tasks` | Tree view grouped by project, person or status (Project → Request → Tasks), with waiting-info and waiting-prerequisite counters and age or remaining time |
| Request phases | `/tasks` | Expanding a request shows its workflow: **Acceptance** → **Planning** → **Delivery**. Open to everyone who can see the request. See [Request workflow](#request-workflow) |
| Attachments | `/tasks` | PDFs, Office documents, images, text and zips on any task. Uploaded straight from the browser to object storage |
| Request detail | `/tasks/:number` | Status, priority, owner, tasks (assignee, estimate, due, planned week, blocker), comments, history |
| Workload | `/workload` | Capacity − meetings − planned tasks per person per week |
| Org chart | `/org-chart` | Interactive tree with search, depth, zoom/pan, team filter and print/export |
| Directory / profiles | `/people` | Contact info, local time, manager and reports, responsibilities, availability |
| Teams | `/teams` | Departments with lead, members and a mini org chart |
| Schedule | `/schedule` | Live week calendar, team availability, meetings with RSVP, "Find a time", `.ics` export. DST-aware time zone conversion |
| Announcements | `/announcements` | Pinned team news with optional notify-all |
| Notifications | `/notifications` | Assignment, comment and meeting notifications |
| Emails | — | Approvals go to whoever must act; every workflow step goes to the admins, Cc'ing whoever took it. See [Emails](#emails) |
| Done report | `/admin/reports` | Admins only: every task completed this week, last week, this month, last month or between two dates, by person and by project, with hours and on-time rate. Export to Excel (CSV) or print |
| Admin | `/admin/*` | Users and access (create accounts, reset passwords, roles), projects, activity log |

## Approving new requests

A new request is not work until someone signs off on it.

| Who raises it | What happens |
|---|---|
| **Gabriel** (Project Leader) | Opens straight away — he is the top of the chain |
| **Elie** (CTO) | Waits for **Gabriel**. Elie alone sees a **Bypass the Project Leader** checkbox for when Gabriel is away |
| **Anyone else**, including the CEO | Waits for **Gabriel or Elie** — either can approve |

**Nobody approves their own request.** That is what the step is for, and it is also what
decides Elie's case: he is an approver, so the only approver left for him is Gabriel.

Anyone may *raise* a request. Editing and deleting stay admin-only.

While a request is pending it is not work: it stays out of the workload and out of
everyone's tree except the author's and the approvers', and its
[workflow phases](#request-workflow) do not open. Approving releases it; rejecting keeps
the record (with the reason, which the author is notified of) but it never becomes work.

Who can do what is stored as flags on the user — `canApproveRequests`,
`skipsRequestApproval`, `canBypassApproval` — not as names, so the chain survives people
changing roles or leaving.

A task's title is written in a **wrapping textarea**, not a single-line box, so a whole
task can be typed out and read back. Up to 500 characters; line breaks are collapsed to
single spaces on save, because the title is what every tree, list and report shows.

### Tasks raised for other people

Anyone can raise a task for anyone, **including across departments** — the project-team
restriction does not apply to who a task may be assigned to.

What keeps that safe is a second gate: unless the author skips it (Gabriel), the task is
created **pending** and is not posted. The assignee is not notified and does not see it;
it counts towards nobody's week or workload, and stays out of the Done report. Only the
author and Gabriel see it at all. Gabriel approves — and only then is the assignee told —
or rejects with a reason the author is notified of.

Gabriel is told **by email** as well as in the app, and on approval so is the assignee, so
neither has to be watching the portal for work to move. See
[Approval emails](#emails).

**Task approval is Gabriel's alone.** Requests take Gabriel *or* Elie; tasks take Gabriel,
so Elie approving a task is refused. Driven by `canApproveTasks` / `skipsTaskApproval`,
separate from the request flags, so either chain can change without touching the other.

## Emails

Two things email: the **approval chain**, where somebody has to act, and the **workflow**,
where somebody has to be able to see. Everything else — comments, meetings, RSVPs — stays
in-app, because an inbox that fills with portal noise stops being read.

### Approval — someone must act

| When | Who gets it | Why them |
|---|---|---|
| A task is raised for someone | **Gabriel** | He is the only person who can approve it. The assignee is deliberately not told — the task has not been posted |
| Gabriel approves it | **The person it is for** | This is the first they hear of it; it is now on their week and their workload |
| Gabriel rejects it | **Whoever raised it** | With the reason he gave |
| A new request is raised | **Its approvers** (Gabriel, or Gabriel and Elie) | Same gate, one level up |
| A request is approved | **Its author and its new owner** | It is live work now and its Acceptance phase is open |
| A request is rejected | **Its author and the person who would have owned it** | The same two people, so the decision reaches whoever was expecting the work |

Every message carries the request's `#number`, the task, its due date and estimate, and a
link straight to it.

**A rejection sends the decision, never the request.** Approval is what hands somebody
work, so the owner's copy says what was decided and why, and states plainly that nothing
has been assigned — it must not read like an assignment. Author and owner being the same
person gets one copy, not two.

**A rejected task is the exception: only its author hears.** The assignee was never told
the task existed — that is the whole point of holding it pending — so telling them now
that work they never knew about has been cancelled would leak exactly what the gate
exists to withhold.

### Workflow — someone must see

Every step of the [three-phase workflow](#request-workflow) is emailed to **the admins** —
today the CEO, the Project Leader and the CTO — so the people answerable for delivery can
follow a request through the pipeline without opening the portal.

| Step | Subject reads |
|---|---|
| Acceptance accepted | `#42 … — accepted — now in Planning` |
| Accepted as Support | `#42 … — accepted as Support, closed` |
| Planning finalized | `#42 … — planned — now in Delivery` |
| Sent for review | `#42 … — under review` |
| Delivered | `#42 … — delivered` |
| Any phase cancelled | `#42 … — Planning cancelled` |

Addressed to the **role, not to three names**, so it survives someone joining, leaving or
changing job — the same reasoning as the approval flags.

**Sent as the person who took the step**, so it arrives under their name and a reply goes
back to them: the admins are reading a report from a colleague, not a notice from a
system. The wording is the same string that goes into the activity log, so the two can
never drift apart.

Sending as somebody else is done the only way that survives a mail server's spam checks:

- the **From header** is the actor (`Elie Saide <e.saide@tutwithus.com>`), and `Reply-To`
  is their address;
- the **SMTP envelope** stays `info@tutwithus.com`, the mailbox we actually authenticated
  as. It has to be set explicitly — left alone, the library takes the envelope from the
  From header, and a server that signed in as `info@` then posting as somebody else is
  exactly what relay abuse looks like, so the host refuses it;
- an actor **outside the domain** falls back to sending as `info@`. SPF and DKIM only
  cover `tutwithus.com`, so sending as, say, a contractor's Gmail address would land in
  spam or be rejected. Their address is kept as `Reply-To`.

Sent from **info@tutwithus.com** over Titan's SMTP (`smtp.titan.email:465`), set with
`SMTP_USER` / `SMTP_PASS`. A shared mailbox rather than a person's: replies land somewhere
the team already watches, and rotating its password disturbs nobody's mail client. Titan
needs **"Enable Titan on other apps"** switched on for that mailbox, or it refuses the
login whatever the password. Links are built from `APP_URL`, so set that to the real
address in production or people receive `localhost` links.

**Email is optional and never blocks.** With `SMTP_USER`/`SMTP_PASS` unset nothing is
sent and the portal is otherwise unaffected — the same arrangement as attachments. A send
that fails is logged, not thrown: approving a task is the real work, and an in-app
notification has already been written, so a mailbox being down never costs anyone the news
or leaves an approval half-applied.

## Request workflow

Expanding a request in the tree shows three phases underneath it. Each is **activated**
first (a red check marks it live), then filled in, then closed with an action. A phase
stays locked until the one before it is done — enforced on the server, not just hidden in
the UI.

Every expandable row carries an arrow: pointing right when collapsed, rotating down when
open. It is driven by a **named** group (`group/req` + `group-open/req:rotate-90`) rather
than a bare `group-open:`, which would match any open ancestor and leave every arrow in a
nested tree pointing down.

| Phase | Fields | Actions |
|---|---|---|
| **Acceptance** | *Accept this as* (New request / Issue / Support) and *Type* (Improvement / Support / Fix / Content / Other). Accept stays disabled until both are set | Accept · Cancel |
| **Planning** | Opening date (today, fixed), delivery date, preparation hours and execution hours — shown as days at 8 h = 1 day | Finalize · Cancel |
| **Delivery** | — | Review · Finalize · Cancel |

The phases are named for **what each step decides**, not who does the work, so one
workflow fits every department:

| Department | Preparation | Execution | Review |
|---|---|---|---|
| Development & Platform | analysis | building | QA |
| Marketing & Social Media | research, concept | producing the content | approval before publishing |
| Tutors & Clients | assessing the case | resolving it | follow-up confirmation |
| Sales / PMO | qualifying, preparing | pitching, negotiating | client sign-off |

One shared vocabulary also means "what is sitting in Planning?" is answerable across the
whole company, which per-department phase names would make impossible.

The request's own status follows along: **In progress** when accepted, **Done** when
finalized — and **completing a request completes the work inside it**: any task still open
is marked done and stamped with the request's closing time. The Done report counts tasks,
not requests, so without that a delivered request would report as nothing delivered. The
same applies to setting a request to Done by hand. It is recorded in the activity log,
since they are completions nobody clicked.

**Cancel backs out of the phase** — it closes the editor and leaves the request untouched,
so a misclick cannot take live work off the board. Rejecting a request outright is a
separate decision, made with the request's own status control on `/tasks/:number`.

**Support is the exception.** Accepting as Support closes the request immediately — it is
handled with the client by email, so there is nothing to analyse or build, and both later
phases stay locked.

**Running the workflow is open to everyone**, not just admins. Whoever is doing the work
accepts, plans and delivers it themselves rather than queueing behind Charbel, Elie or
Gabriel — all three phases, on any request they can already see.

That last part is the whole limit: a request a person cannot see is a `404` here exactly
as it is everywhere else, so the gate is the existing visibility rule — you own it, you
raised it, you have a task in it, or it is in your department's projects — not a role.
Editing a request's fields, adding or reassigning its tasks, and deleting it all stay
admin-only; the phases no longer do.

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
| `APP_URL` | — | Where the portal is reachable; builds the links inside [approval emails](#emails). Defaults to `http://localhost:5173` |
| `SMTP_USER` / `SMTP_PASS` | — | The mailbox approval emails are sent from. Both or neither; unset means no email |
| `SMTP_HOST` / `SMTP_PORT` | — | Default `smtp.titan.email` / `465`. Port 465 uses implicit TLS, 587 STARTTLS |
| `SMTP_FROM` | — | What recipients see in "From". Defaults to `TutWithUs Portal <SMTP_USER>` |
| `SPACES_KEY` / `SPACES_SECRET` / `SPACES_BUCKET` | — | Attachments. All three or none |
| `SPACES_REGION` | — | Defaults to `fra1` |
| `SPACES_ENDPOINT` | — | Derived from the region when unset |
| `MAX_ATTACHMENT_MB` | — | Defaults to 25 |

### Deploying (what production runs)

Root directory `backend`, then:

```bash
# Build
npm ci --include=dev && npm run build
# Start
npm start
```

`--include=dev` is not optional: with `NODE_ENV=production` set, npm skips
devDependencies, and `esbuild` and `tsx` live there — the build fails without it.

**`frontend/dist` is committed**, so the deploy does not run Vite. That keeps the build
small and fast, and keeps it off a 512 MB instance where the frontend build is the step
most likely to be killed for memory.

The cost is that the build output has to be refreshed by hand. **After any frontend
change, run `npm run build` in `frontend/` and commit `dist/` along with the source** —
otherwise the deployed app silently keeps serving the previous UI while the source says
otherwise.

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
| Infrastructure | `backend/src/Infrastructure/` | Technical plumbing: `Config/` (env), `Database/` (MongoDB connection), `Security/` (JWT session, password hashing), `Storage/` (S3-compatible object storage for attachments), `Email/` (SMTP transport), `Seed/` (sample data and `migrate.ts`) |
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
