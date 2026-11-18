# Education Web

A Hebrew, right-to-left school and family learning application (סקולי), with parent,
student, teacher, and administrator screens for assignments, exams, calendars, and
communication. The React frontend is installable as a PWA; an Express demo API and
a PostgreSQL/Prisma data model are maintained alongside it.

## Architecture and current status

| Layer | Implementation | Current data flow |
| --- | --- | --- |
| Frontend | React, TypeScript, Mantine, Vite | Email/password sign-in gates the application. Assignment/exam screens use demo data. Parent progress uses a protected aggregate contract with an explicit fictional demo. |
| API client | `frontend/src/services/` | Typed services include the session cookie and handle authentication, parent progress, and reminder capability status. Existing assignment screens still use demo state. |
| Backend | Express, TypeScript, Zod | Email/password authentication issues database-backed sessions. Assignments/exams and notifications use demo data. Parent linking and reminder preferences use Prisma behind trusted authentication boundaries. |
| Database | PostgreSQL, Prisma | Models users, hashed session tokens, optional student school membership, verified parent links, reminder preferences, and the school/learning domain. Existing demo assignment/exam services remain in memory. |

Registration creates a parent account. Login sessions use a 14-day HttpOnly
cookie and store only a SHA-256 hash of the session token. `SameSite=Lax` is the
default; configure `AUTH_COOKIE_SAME_SITE=none` only when the frontend and API
are cross-site and served over HTTPS. Authentication does not verify a person's
identity, establish a parent-child relationship, or replace the reviewed proof
required by parent-linking routes.

The [verified parent-linking API](backend/docs/parent-linking.md) persists pending,
verified and revoked relationships. Its routes deny access until a trusted
authentication adapter is connected; consent eligibility and guardian proof must
come from reviewed, trusted verification. Existing demo routes remain separate.

The API exposes `/api/health`, `/api/auth/register`, `/api/auth/login`,
`/api/auth/me`, `/api/auth/logout`, `/api/assignments`, `/api/exams`,
`/api/notifications`, `/api/parent-links`, and `/api/parent-reminders`. Assignment
completion, exam publication, preparation, and study-task endpoints operate on
the backend's in-memory data.

The PWA caches the built application shell and local static assets after an online
visit. It offers an update prompt before reloading. API responses, writes,
external Google Fonts, and offline synchronization are not cached or supported.
See the [frontend PWA guide](frontend/README.md) for the full behavior and browser
verification steps.

### Parent learning reminders

Issue #38 adds a staged preference and eligibility foundation. Email, push, and
in-app delivery remain disabled, and the production preference API denies access
until trusted authentication is connected. The persisted parent-link lifecycle
exists; reminder integration with permitted progress and delivery remains gated.
No scheduler or transport is implemented or selected, and no privacy approval is
claimed. See the [reminder policy and prerequisites](docs/parent-learning-reminders.md)
for opt-in defaults, quiet hours, frequency caps, data requirements, and validation
limits.

The [parent progress overview](docs/parent-progress.md) has a separate aggregate
API contract. Its backend endpoints and permitted practice aggregates are still
pending. Until connected, the overview shows an unavailable state and offers an
explicitly labeled fictional demo without using demo roles as authorization.

## Project layout

```text
frontend/
  src/pages/             Role-specific screens
  src/components/        Shared UI, navigation, assignments, and PWA status
  src/hooks/             UI state and feature logic
  src/services/          Prepared API client and services
  src/data/              Demo data
  src/types/             Frontend domain types
  scripts/               PWA lifecycle tests and build-artifact verification
  public/                Icons and static assets
backend/
  src/modules/           Assignment, exam, and notification routes/services
  src/routes/            Health endpoint
  src/config/            Environment validation
  prisma/schema.prisma   PostgreSQL data model
api/index.mjs            Vercel entry point for the Express API
vercel.json              Combined frontend/API hosting and PWA headers
agents/skills/           Repository coding conventions
```

## Prerequisites

- Node.js 24 (used by the test CI)
- npm 10 or newer
- PostgreSQL 16 or newer for the optional local database workflow

## Local setup

Run commands from the repository root unless a section says otherwise. The
frontend and backend have separate lockfiles; this is not an npm workspace.

1. Install dependencies:

   ```powershell
   npm --prefix frontend ci
   npm --prefix backend ci
   ```

2. Copy the example environment files, then edit the copies for your machine:

   ```powershell
   Copy-Item frontend/.env.example frontend/.env
   Copy-Item backend/.env.example backend/.env
   ```

3. Start each application in a separate terminal:

   ```powershell
   npm run dev:frontend
   ```

   ```powershell
   npm run dev:backend
   ```

The frontend normally runs at `http://localhost:5173`; use the URL Vite prints if
that port is occupied. The API defaults to `http://localhost:4000`. Open
`http://localhost:4000/api/health` and expect `{"status":"ok"}`. This checks the
HTTP server only, not database connectivity. If you change the frontend origin,
update `CORS_ORIGIN` in `backend/.env` and restart the backend.

The demo frontend can run independently of the API and database. The demo API
also runs without PostgreSQL. Set `DATABASE_URL` and run a database only for Prisma
database commands; invalid URLs are rejected when supplied.

### Environment variables

Examples below contain local placeholder values only. Keep actual credentials in
ignored `.env` files or the hosting provider's environment settings.

| Location | Variable | Requirement/default | Purpose |
| --- | --- | --- | --- |
| `frontend/.env` | `VITE_API_URL` | Optional; localhost in development, `/api` in production | Base URL, including `/api`, for the prepared API client. Public, build-time configuration; do not put secrets here. |
| `backend/.env` | `DATABASE_URL` | Optional for demo routes; required for Prisma | PostgreSQL connection string. When supplied, it must be a valid URL. |
| `backend/.env` | `NODE_ENV` | Optional; `development` | One of `development`, `test`, or `production`. Use `production` on a host. |
| `backend/.env` | `PORT` | Optional; `4000` | Positive integer used by the HTTP listener. |
| `backend/.env` | `CORS_ORIGIN` | Optional; localhost in development, `https://education-8mju.vercel.app` in production | A single allowed frontend origin, including scheme and port when applicable. |
| `backend/.env` | `AUTH_COOKIE_SAME_SITE` | Optional; `lax` | Cookie cross-site policy. Use `none` only for cross-site HTTPS deployments. |

Restart the backend after changing its environment. Restart Vite for local
frontend changes; rebuild/redeploy for production `VITE_API_URL` changes.

### Optional local database workflow

Create an empty local PostgreSQL database named `education_web`, and set
`DATABASE_URL` to its connection string. For an existing database, follow the
[baseline instructions](backend/prisma/README.md) before applying migrations.
For a new empty database, run:

```powershell
npm run prisma:generate
npm --prefix backend exec -- prisma migrate deploy --schema backend/prisma/schema.prisma
npm --prefix backend run prisma:studio
```

`prisma:generate` generates the client; `migrate deploy` applies tracked migrations;
Studio inspects the database. These commands do not switch the existing demo
services to database storage or populate demo data. The parent-link service uses
Prisma once a trusted authentication adapter is configured.

There is no seed script. The repository includes a versioned baseline and additive
parent-link and reminder-preference migrations; synthetic fixtures live in the
integration tests.
The upgrade preserves school records and revokes unverified legacy parent links.

## Development and verification

Follow [AGENTS.md](AGENTS.md) and the
[frontend conventions](agents/skills/frontend-conventions/SKILL.md) when changing
code. Keep user-facing frontend strings in feature-local `strings.ts` files.

Run these checks from the repository root after installing dependencies:

| Command | What it checks |
| --- | --- |
| `npm run build` | Frontend TypeScript/Vite production build, then Prisma client generation and backend TypeScript compilation. Outputs `frontend/dist/` and `backend/dist/`. |
| `npm run prisma:migrate:deploy` | Apply tracked migrations to the explicitly configured database; no reset or schema generation. |
| `npm run prisma:migrate:status` | Check tracked migration history on the explicitly configured database. |
| `npm run db:check` | After building the backend, verify database connectivity, required schema columns, and applied migration history. |
| `npm --prefix frontend run lint` | Current frontend lint script (Oxlint). |
| `npm --prefix frontend run format:check` | Biome formatting of frontend source, without writing changes. |
| `npm --prefix frontend exec -- biome check frontend` | Repository-configured Biome lint/format checks for frontend files; run this for frontend code changes as required by the conventions. |
| `npm --prefix backend test` | Prisma generation, test type checking, backend Node API/reminder regressions, and Vitest unit/API tests. |
| `npm test` | Frontend component/service, progress, icon, and reminder tests, then all backend unit/API/reminder tests. |
| `npm run test:integration` | Prisma integration tests against the dedicated local test database; see setup below. |
| `npm --prefix frontend run test:pwa` | PWA lifecycle regression tests, then generated PWA artifact verification. Requires a successful frontend build first. |
| `npm run test:deployment` | API HTTP/CORS/environment checks and Vite API URL regression tests. Run after building. |
| `npm run test:backend-deployment` | Compiled API adapter and real `npm start` smoke tests, including host-supplied port and CORS settings. Requires a backend build. |
| `npm --prefix backend run test:reminders` | Prisma generation, reminder policy and preference-access tests, and HTTP denial checks. No database or delivery integration is exercised. |
| `npm --prefix frontend run test:reminders` | Reminder status API request, disabled defaults, cancellation, and HTTP/network failures. |
| `npm --prefix frontend run test:parent-progress` | Parent progress service, dashboard, and state transitions without a database. |
| `npm --prefix frontend run test:icons` | Shared icon usage and accessibility regressions. |
| `npm --prefix frontend run verify:pwa` | Artifact verification alone, against the existing `frontend/dist/` build. |

To build one side independently, use `npm --prefix frontend run build` or
`npm --prefix backend run build`. To apply frontend formatting, use
`npm --prefix frontend run format` and review the changes.

GitHub Actions runs frontend, backend, and isolated database tests on pull requests.
There is no backend lint script. PWA artifact checks and lifecycle tests do not replace browser testing.
Builds do not require a running database; database migration commands do.

For a local PWA smoke test, build first, then preview:

```powershell
npm --prefix frontend run build
npm --prefix frontend run test:pwa
npm --prefix frontend run preview -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173` in Chrome or Edge. Check the manifest and activated
service worker in DevTools, reload once online, then test offline reopening,
installation, and the update prompt. The worker is disabled under
`npm run dev:frontend`. Localhost is allowed without HTTPS; other devices/origins need
HTTPS. Follow the [full PWA checklist](frontend/README.md) for browser steps,
iPhone installation, and a two-build update test.

### Backend API tests

After installing backend dependencies, run from the repository root:

```powershell
npm --prefix backend test
```

Backend builds and the default backend test command generate the Prisma client automatically.
Client generation needs no running database or applied migrations.

The suite covers health responses; assignment listing, student filtering, and
completion, including persistence across requests and repeated completion; exam
listing, publication, preparation, and study tasks; payload validation; and
missing resources. It also covers parent-link HTTP validation, reminder consent,
access, and eligibility policy.

The command generates the Prisma client, type-checks the backend tests, runs the
Node API and reminder regressions, then runs Vitest unit/API tests. The runners
use controlled test environment values and separate processes. No PostgreSQL
server or migrations are needed, and the API tests do not touch a personal
database. A generated Prisma client is required because the application imports
the guarded reminder preference adapter. These tests verify the current demo API
and reminder policy; Prisma persistence is covered separately below.

Run `npm --prefix backend run test:reminders` for the reminder policy, consent,
access, and HTTP denial checks separately. That command generates the Prisma client
and executes TypeScript source through the existing test runner. Its preference
tests use an in-memory test store. The isolated integration suite below exercises
the actual Prisma reminder adapter; production authentication and reminder
delivery remain gated. See the
[reminder validation limits](docs/parent-learning-reminders.md#validation-and-remaining-prerequisites).

### Frontend and backend test commands

```powershell
npm test                                  # Frontend and backend unit/API/reminder tests
npm --prefix frontend run test:watch       # Frontend Vitest watch mode
npm --prefix backend run test:watch        # Backend Vitest watch mode
npm --prefix backend run test:typecheck    # Type-check backend source, tests, and test configuration
```

Frontend tests render the real application with controlled browser APIs and
mock network responses at the API boundary. They cover assignment filtering and
completion, child selection, role-specific dashboards/navigation, and pending,
successful, and failed API requests. The default frontend test command also runs
the standalone parent-progress and icon suites, and reminder service tests for
status requests, disabled defaults, cancellation, and HTTP/network failures.
Additional backend coverage checks
request validation, missing records, JSON error responses, and environment validation.

### Isolated PostgreSQL integration tests

Start the disposable database, generate Prisma Client, and run the database tests:

```powershell
docker compose -f compose.test.yaml up -d --wait
npm --prefix backend run prisma:generate
$env:TEST_DATABASE_URL = "postgresql://education_test:education_test@localhost:55432/education_web_test"
npm run test:integration
docker compose -f compose.test.yaml down
```

On macOS/Linux, use `export TEST_DATABASE_URL='postgresql://education_test:education_test@localhost:55432/education_web_test'`
for the environment-variable step. Docker is optional if you already have a
dedicated local PostgreSQL database with this exact database name.

The integration runner requires `TEST_DATABASE_URL` explicitly and never falls
back to `DATABASE_URL` or `.env`. It rejects remote hosts, other database names,
and connection parameters that could redirect the connection. Each run creates a
random schema, applies the tracked migrations using `prisma migrate deploy`, then
drops only that generated schema during teardown. No migrations or resets run
against application data. The Docker database uses temporary storage; stopping
the container discards its data.

These tests exercise assignment defaults, student-scoped reads, persisted
completion, foreign-key enforcement, missing updates, and transaction rollback.
Parent-link tests exercise real HTTP/database flows, consent and guardian checks,
expiry, concurrent redemption, revocation, and the versioned migration. Existing
assignment/exam endpoints still use in-memory services. The migration suite also
checks the additive reminder preference storage and disabled sharing defaults.
Reminder adapter tests verify persisted choices and reload, separate opt-out,
current account/status/consent/guardian checks, relinking with the same verification
timestamp and a new request ID, sharing-scope reset, stale consent write denial,
revocation between read and save, and preference deletion when the link is deleted.
CI runs the suites with disposable PostgreSQL on pull requests.

### Current coverage limits

The application has no configured authentication provider. Parent-link tests use
a trusted test session resolver; production linking and reminder preference routes
deny all requests until their trusted session dependencies are connected. Those
denials are tested. Demo assignment authorization tests remain
TODOs until authenticated roles and ownership checks exist; passing tests do not
imply restricted demo data access. Assignment screens still use local mock data,
so API loading/error coverage tests pending promises and error propagation in the
real API client and service rather than an API-backed loading/error screen.

## Production on Vercel

See the [backend deployment runbook](backend/docs/deployment.md) for the current
deployment, standalone Node host commands, and anonymous health verification.

The production website is https://education-8mju.vercel.app/ and its API base URL
is https://education-8mju.vercel.app/api. The root `vercel.json` builds both apps,
serves `frontend/dist`, and routes `/api` and `/api/*` to `api/index.mjs`. This
entry point exports the existing Express application from `backend/dist/app.js`
without starting a separate port listener. API paths bypass the SPA fallback.

For the existing Vercel project, change these settings before redeploying:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (clear `frontend`) |
| Framework Preset | Other |
| Node.js Version | 22.x or 24.x |
| Install Command | Use the root `vercel.json` command |
| Build Command | `npm run build` (from `vercel.json`) |
| Output Directory | `frontend/dist` (from `vercel.json`) |

Remove any old dashboard command/output overrides that still refer to the
frontend directory. The configured install command installs both lockfiles,
including development dependencies needed for TypeScript and the PWA build.

Set these environment variables in the Vercel project's **Production** scope:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Server-only pooled PostgreSQL URL with TLS; required for database readiness and Prisma (demo routes remain available without it) |
| `CORS_ORIGIN` | `https://education-8mju.vercel.app` (no trailing slash) |
| `VITE_API_URL` | `/api`, or remove this variable to use the production default |

See `backend/.env.production.example` for backend values. Do not copy local
`.env` files to production or expose `DATABASE_URL` through a `VITE_` variable.
The backend validates `DATABASE_URL` when supplied. Its current demo routes work
without it and keep data in memory; changes to demo data do not persist
across function instances or deployments. Database integration is separate work.

Redeploy after changing these settings or `VITE_API_URL`: Vite embeds frontend
environment variables at build time. The default relative `/api` also works on
preview domains; configure preview environment variables separately if needed.
For a separately hosted backend, `VITE_API_URL` can instead be its full HTTPS
base URL ending in `/api`, with backend CORS set to the frontend's origin.

Verify the deployed version:

1. Open `/api/health` and confirm HTTP 200 with `{"status":"ok"}` and a JSON content type.
2. Open `/api/assignments?studentId=noa` and confirm a JSON array.
3. Request `/api/health` with `Origin: https://education-8mju.vercel.app` and
   confirm `Access-Control-Allow-Origin: https://education-8mju.vercel.app`.
4. Open `/api/missing` and confirm a JSON 404, then open `/assignments` and
   confirm the frontend shell still loads.
5. From the website's browser console, run
   `fetch('/api/assignments?studentId=noa').then(r => r.json()).then(console.log)`.
   Check the Network tab: the request must use the deployed domain over HTTPS.
   Existing dashboard screens still use demo state; this configuration does not
   replace that state with API-backed data.
6. Follow the install, offline, and update checks in `frontend/README.md`.

## Production database

Follow the [production PostgreSQL runbook](docs/production-database.md) to provision
Neon through Vercel, configure server-only secrets, apply tracked migrations, and
verify connectivity. Neon is provisioned, and the last recorded production
migration check predates the account-auth migration. Verify and apply all tracked
migrations before relying on registration; the runbook records the resource,
deployment, and remaining recovery planning before real data is introduced.

`GET /api/health` remains process liveness. `GET /api/health/ready` runs read-only
database/schema probes and returns HTTP 200 when available or a generic HTTP 503
when configuration, connectivity, or required tables/columns are missing, including
the auth session schema. It does not return credentials, hostnames, records, or
migration details, and responses are not cached. `npm run db:check` additionally
checks the tracked migration history.

Parent linking and reminder preferences still require trusted authentication and
reviewed verification providers; database provisioning does not enable these gates.
Assignment/exam routes continue to use demo data. `prisma:migrate` is local-only
(`migrate dev`); production uses `prisma:migrate:deploy` (`migrate deploy`).
