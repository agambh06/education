# Education Web

A parent, teacher, and school-administrator communication platform. This repository currently contains the initial frontend, backend, and database setup only.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- PostgreSQL 16 or newer

## Project layout

- `frontend/` - React, TypeScript, and Vite application.
- `backend/` - Express and TypeScript API.
- `backend/prisma/` - Prisma schema and database migrations.

## Setup

1. Create a PostgreSQL database named `education_web`.
2. Copy the example environment files:

   ```powershell
   Copy-Item frontend/.env.example frontend/.env
   Copy-Item backend/.env.example backend/.env
   ```

3. Update `backend/.env` with the PostgreSQL connection string.
4. Install dependencies:

   ```powershell
   npm --prefix frontend install
   npm --prefix backend install
   ```

5. Generate the Prisma client and create the initial database migration:

   ```powershell
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

## Run locally

Run these in separate terminals:

```powershell
npm run dev:frontend
npm run dev:backend
```

The frontend runs on `http://localhost:5173`; the API runs on `http://localhost:4000`. Visit `http://localhost:4000/api/health` to confirm API availability.

## Verification

```powershell
npm run build
```

This validates TypeScript and creates production builds. A running PostgreSQL database is required only for migrations and database-backed API features.

## Tests

Install the locked dependencies with `npm --prefix frontend ci` and `npm --prefix backend ci`. Use Node.js 24 (the version used in CI).

```powershell
npm test                                  # Frontend component/service tests and backend unit/API tests
npm --prefix frontend run test:watch       # Frontend watch mode
npm --prefix backend run test:watch        # Backend watch mode
npm --prefix backend run test:typecheck    # Type-check backend source, tests, and test configuration
npm --prefix frontend run build           # Frontend TypeScript check and production build
npm --prefix frontend run format:check     # Biome formatting check
npm --prefix frontend run test:pwa         # Existing PWA regression checks (after the build)
```

Unit and API tests use controlled fixtures, fixed application configuration, and mocked network responses. They need neither a database nor a running application. Frontend tests cover assignment filtering/completion, role-specific dashboards/navigation, and pending/success/error behavior at the API service boundary. Backend API tests cover assignment reads, filtering, completion, request validation, missing records, and error responses.

### Isolated PostgreSQL integration tests

Start the dedicated, disposable database, generate Prisma Client, and run the integration tests:

```powershell
docker compose -f compose.test.yaml up -d --wait
npm --prefix backend run prisma:generate
$env:TEST_DATABASE_URL = "postgresql://education_test:education_test@localhost:55432/education_web_test"
npm run test:integration
docker compose -f compose.test.yaml down
```

On macOS/Linux, use `export TEST_DATABASE_URL='postgresql://education_test:education_test@localhost:55432/education_web_test'` for the environment-variable step. Docker is optional if you already have a dedicated local PostgreSQL database with this exact database name.

The integration runner requires `TEST_DATABASE_URL` explicitly and never falls back to `DATABASE_URL` or `.env`. It rejects remote hosts, other database names, and connection parameters that could redirect the connection. Each run creates a random schema, applies the existing Prisma schema using `prisma db push`, then drops only that generated schema during teardown. No migrations or resets run against application data. The Docker database uses temporary storage; stopping the container discards its data.

These tests exercise the real Prisma schema: assignment defaults, student-scoped reads, persisted completion, foreign-key enforcement, missing updates, and transaction rollback. The current assignment HTTP endpoints use an in-memory demo service, so these database tests are separate from API endpoint tests. CI runs both suites against a disposable PostgreSQL service for every pull request.

### Current coverage limits

The application has no authenticated server-side identity or authorization middleware yet. The role selector controls presentation only. Authorization tests are recorded as TODOs until authenticated roles and assignment ownership checks exist; the suite does not claim that access is restricted. Assignment screens still use local mock data, so API loading/error coverage currently tests pending promises and error propagation in the real API client/service rather than a nonexistent API-backed loading/error screen.
