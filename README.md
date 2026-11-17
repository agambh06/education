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

## Environment configuration

The frontend API client reads `VITE_API_URL` at build time. Keep the local
example value (`http://localhost:4000/api`) for development. In the Vercel
project, set `VITE_API_URL=/api` so browser requests stay on the deployed
frontend origin. Redeploy after changing this value. Production builds fail
clearly if it is missing or points to localhost.

The backend reads `CORS_ORIGIN` as the single allowed frontend origin. Keep
`http://localhost:5173` in `backend/.env` for local development. In the Vercel
production environment, set `CORS_ORIGIN=https://education-8mju.vercel.app`
without a trailing slash. Production startup fails if this value is missing.

Check the deployed connection by opening
`https://education-8mju.vercel.app/api/health`; it should return HTTP 200 with
`{"status":"ok"}`. A browser request from the deployed site should use the
same `/api` origin and return JSON. Keep database credentials server-side and
never add them to a `VITE_` variable.

The Vercel project must use the repository root as its Root Directory so it
loads the root `vercel.json`. That configuration builds both apps, serves
`frontend/dist`, and routes `/api` to the compiled Express app through
`api/index.mjs`. Set the Vercel Production values to `VITE_API_URL=/api`,
`CORS_ORIGIN=https://education-8mju.vercel.app`, and `NODE_ENV=production`.
`DATABASE_URL` is optional for the current in-memory demo API; configure it only
when database-backed features are enabled.

## Verification

```powershell
npm run build
```

This validates TypeScript and creates production builds. A running PostgreSQL database is required only for migrations and database-backed API features.
