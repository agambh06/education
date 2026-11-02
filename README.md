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
  vercel.json            Frontend hosting rewrites and PWA headers
backend/
  src/modules/           Assignment, exam, and notification routes/services
  src/routes/            Health endpoint
  src/config/            Environment validation
  prisma/schema.prisma   PostgreSQL data model
agents/skills/           Repository coding conventions
```

## Prerequisites

- Node.js 22.12 or newer (required by the locked frontend tools)
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
requires a syntactically valid `DATABASE_URL` at startup, but does not connect to
PostgreSQL. A running database is needed for Prisma database commands.

### Environment variables

Examples below contain local placeholder values only. Keep actual credentials in
ignored `.env` files or the hosting provider's environment settings.

| Location | Variable | Requirement/default | Purpose |
| --- | --- | --- | --- |
| `frontend/.env` | `VITE_API_URL` | Optional; `http://localhost:4000/api` | Base URL, including `/api`, for the prepared API client. Public, build-time configuration; do not put secrets here. |
| `backend/.env` | `DATABASE_URL` | Required; no default | PostgreSQL URL, e.g. `postgresql://USER:PASSWORD@localhost:5432/education_web?schema=public`. Required by startup validation even while services use demo data. |
| `backend/.env` | `NODE_ENV` | Optional; `development` | One of `development`, `test`, or `production`. Use `production` on a host. |
| `backend/.env` | `PORT` | Optional; `4000` | Positive integer used by the HTTP listener. |
| `backend/.env` | `CORS_ORIGIN` | Optional; `http://localhost:5173` | A single allowed frontend origin, including scheme and port when applicable. |

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
| `npm --prefix frontend run test:pwa` | PWA lifecycle regression tests, then generated PWA artifact verification. Requires a successful frontend build first. |
| `npm --prefix frontend run verify:pwa` | Artifact verification alone, against the existing `frontend/dist/` build. |

To build one side independently, use `npm --prefix frontend run build` or
`npm --prefix backend run build`. To apply frontend formatting, use
`npm --prefix frontend run format` and review the changes.

There is no general `npm test` script, backend test/lint script, or checked-in CI
workflow. PWA artifact checks and lifecycle tests do not replace browser testing.
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

## Frontend deployment (Vercel)

Import the repository into Vercel with these project settings:

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set `VITE_API_URL` in the frontend build environment to the backend's HTTPS base
URL including `/api` when API integration is implemented, then rebuild. It is
embedded in the client bundle and is not a runtime server secret.

The committed [Vercel configuration](frontend/vercel.json) serves SPA navigation
through `index.html`, excludes `/api` and file-like paths from that rewrite, and
sets service-worker revalidation and manifest content-type headers. It deploys
only the static frontend; it does not host or proxy the Express API.

After deployment, use the stable HTTPS domain to verify:

1. `/manifest.webmanifest`, `/sw.js`, and manifest icons return their actual files.
   `sw.js` has `Cache-Control: public, max-age=0, must-revalidate`.
2. Direct navigation/reload at `/assignments` serves the application shell.
   Navigation is currently state based, so this path does not select a screen.
3. `/api` and `/api/health` do not return the SPA HTML. A 404 is expected on the
   frontend host without separate API routing.
4. Installation, offline reopening after an online visit, and the update prompt
   work using the [deployment verification guide](frontend/README.md).

## Backend and database deployment status

No backend host, hosted database, or backend deployment configuration is defined
in this repository. Vercel's frontend configuration does not provision them.

For an evaluation deployment of the current in-memory API, use a Node host with
`backend` as its working directory:

```powershell
npm ci --include=dev
npm run build
npm run start
```

Supply `NODE_ENV=production`, the host's `PORT`, a valid `DATABASE_URL`, and
`CORS_ORIGIN` set to the frontend's HTTPS origin. Expose the API over HTTPS and
check `/api/health`. API writes remain temporary, and separate instances have
separate data. Authentication and authorization still need implementation before
using real school data.

Persistent database deployment remains pending. Once database-backed services and
versioned migrations are available, the deployment workflow must provision
PostgreSQL, store its connection string in backend environment settings, generate
the Prisma client during the build, and apply committed migrations with
`prisma migrate deploy` from `backend/`. The existing `prisma:migrate` script uses
`migrate dev` and is for local development. Add provider-specific provisioning,
migration, backup, and restore instructions when that deployment exists.
