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

After building, run the deployment and PWA regression checks:

```powershell
npm run test:deployment
npm --prefix frontend run test:pwa
```

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
| `DATABASE_URL` | Your PostgreSQL connection string, kept secret in Vercel |
| `CORS_ORIGIN` | `https://education-8mju.vercel.app` (no trailing slash) |
| `VITE_API_URL` | `/api`, or remove this variable to use the production default |

See `backend/.env.production.example` for backend values. Do not copy local
`.env` files to production or expose `DATABASE_URL` through a `VITE_` variable.
The backend validates `DATABASE_URL` on startup. Its current demo routes keep
data in memory and do not query PostgreSQL; changes to demo data do not persist
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
