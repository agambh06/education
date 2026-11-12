# Education Web

A Hebrew, right-to-left school and family learning application (סקולי), with parent,
student, teacher, and administrator screens for assignments, exams, calendars, and
communication. The React frontend is installable as a PWA; an Express demo API and
a PostgreSQL/Prisma data model are maintained alongside it.

## Architecture and current status

| Layer | Implementation | Current data flow |
| --- | --- | --- |
| Frontend | React, TypeScript, Mantine, Vite | Pages and hooks read demo data from `frontend/src/data/mockData.ts`. Navigation and role selection use React state. |
| API client | `frontend/src/services/` | A typed request helper and assignment service are prepared, but the screens do not call them yet. |
| Backend | Express, TypeScript, Zod | Routes delegate to services with in-memory assignment/exam data; notifications return demo data. Changes reset when the server restarts. |
| Database | PostgreSQL, Prisma | `backend/prisma/schema.prisma` models users, school years/classes, students, assignments, exams/study plans, resources, messages, and notifications. API services do not yet use Prisma. |

The UI role switch is a demo control. Authentication and server-side permissions
are not implemented. A frontend deployment therefore serves the demo UI, and
setting an API URL alone does not connect it to the backend.

The API exposes `/api/health`, `/api/assignments`, `/api/exams`, and
`/api/notifications`. Assignment completion, exam publication, preparation, and
study-task endpoints operate on the backend's in-memory data.

The PWA caches the built application shell and local static assets after an online
visit. It offers an update prompt before reloading. API responses, writes,
external Google Fonts, and offline synchronization are not cached or supported.
See the [frontend PWA guide](frontend/README.md) for the full behavior and browser
verification steps.

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

Restart the backend after changing its environment. Restart Vite for local
frontend changes; rebuild/redeploy for production `VITE_API_URL` changes.

### Optional local database workflow

Create an empty local PostgreSQL database named `education_web`, and set
`DATABASE_URL` to its connection string. Then run:

```powershell
npm run prisma:generate
npm --prefix backend run prisma:migrate -- --name init
npm --prefix backend run prisma:studio
```

`prisma:generate` generates the client; `prisma:migrate` creates and applies a
development migration; Studio inspects the database. These commands do not switch
the existing API services to database storage or populate demo data.

There is no seed script or committed migration history. The current `.gitignore`
also excludes `backend/prisma/migrations/`; generated migrations remain local.
Versioned migrations and database-backed services are prerequisites for a
repeatable persistent deployment.

## Development and verification

Follow [AGENTS.md](AGENTS.md) and the
[frontend conventions](agents/skills/frontend-conventions/SKILL.md) when changing
code. Keep user-facing frontend strings in feature-local `strings.ts` files.

Run these checks from the repository root after installing dependencies:

| Command | What it checks |
| --- | --- |
| `npm run build` | Frontend TypeScript/Vite production build, then backend TypeScript compilation. Outputs `frontend/dist/` and `backend/dist/`. |
| `npm --prefix frontend run lint` | Current frontend lint script (Oxlint). |
| `npm --prefix frontend run format:check` | Biome formatting of frontend source, without writing changes. |
| `npm --prefix frontend exec -- biome check frontend` | Repository-configured Biome lint/format checks for frontend files; run this for frontend code changes as required by the conventions. |
| `npm --prefix backend test` | Backend API regression tests using the actual Express routes and in-memory demo services. |
| `npm test` | Frontend component/service tests and all backend unit/API tests. |
| `npm run test:integration` | Prisma integration tests against the dedicated local test database; see setup below. |
| `npm --prefix frontend run test:pwa` | PWA lifecycle regression tests, then generated PWA artifact verification. Requires a successful frontend build first. |
| `npm run test:deployment` | API HTTP/CORS/environment checks and Vite API URL regression tests. Run after building. |
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

The suite covers health responses; assignment listing, student filtering, and
completion, including persistence across requests and repeated completion; exam
listing, publication, preparation, and study tasks; payload validation; and
missing resources.

The command type-checks the backend tests, runs the existing Node API regressions,
then runs Vitest unit/API tests. Both runners use controlled test environment
values and separate processes. No PostgreSQL server or migrations are needed,
and the API tests do not touch a personal database. This verifies the current
demo API; Prisma persistence is covered separately below.

### Frontend and backend test commands

```powershell
npm test                                  # Frontend component/service and all backend unit/API tests
npm --prefix frontend run test:watch       # Frontend Vitest watch mode
npm --prefix backend run test:watch        # Backend Vitest watch mode
npm --prefix backend run test:typecheck    # Type-check backend source, tests, and test configuration
```

Frontend tests render the real application with controlled browser APIs and
mock network responses at the API boundary. They cover assignment filtering and
completion, child selection, role-specific dashboards/navigation, and pending,
successful, and failed API requests. Additional backend coverage checks request
validation, missing records, JSON error responses, and environment validation.

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
random schema, applies the existing Prisma schema using `prisma db push`, then
drops only that generated schema during teardown. No migrations or resets run
against application data. The Docker database uses temporary storage; stopping
the container discards its data.

These tests exercise assignment defaults, student-scoped reads, persisted
completion, foreign-key enforcement, missing updates, and transaction rollback.
The HTTP endpoints still use an in-memory service, so database tests are separate
from endpoint tests. CI runs both suites with disposable PostgreSQL on pull requests.

### Current coverage limits

The application has no authenticated server-side identity or authorization
middleware. Authorization tests are recorded as TODOs until authenticated roles
and assignment ownership checks exist; passing tests do not imply restricted
access. Assignment screens still use local mock data, so API loading/error
coverage tests pending promises and error propagation in the real API client and
service rather than an API-backed loading/error screen.

## Production on Vercel

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
| `DATABASE_URL` | Optional for demo routes; set a PostgreSQL URL when using Prisma |
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

## Database deployment status

Persistent database deployment remains pending. Once database-backed services and
versioned migrations are available, the deployment workflow must provision
PostgreSQL, store its connection string in backend environment settings, generate
the Prisma client during the build, and apply committed migrations with
`prisma migrate deploy` from `backend/`. The existing `prisma:migrate` script uses
`migrate dev` and is for local development. Add provider-specific provisioning,
migration, backup, and restore instructions when that deployment exists.
