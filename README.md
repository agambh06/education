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

3. Update `backend/.env` with the PostgreSQL connection string and set `CORS_ORIGIN` to the frontend's exact origin. In production, serve the API over HTTPS so authentication cookies use the `Secure` flag. Set `AUTH_COOKIE_SAME_SITE=none` when the frontend and API are hosted on different sites; this enables cross-site cookies and requires HTTPS. The default `lax` setting suits same-site deployments and local development.
4. Install dependencies:

   ```powershell
   npm --prefix frontend install
   npm --prefix backend install
   ```

5. Generate the Prisma client and apply the database migration:

   ```powershell
   npm run prisma:generate
   npm run prisma:migrate
   ```

## Run locally

Run these in separate terminals:

```powershell
npm run dev:frontend
npm run dev:backend
```

The frontend runs on `http://localhost:5173`; the API runs on `http://localhost:4000`. Visit `http://localhost:4000/api/health` to confirm API availability.

## Authentication

Users can register as parent accounts or sign in with an existing account. Passwords are stored as salted scrypt hashes. The API issues a random session token in an HttpOnly cookie and stores only its SHA-256 hash in the database. Sessions expire after 14 days. `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` provide the account flow. Assignment, exam, and notification API routes require a valid session; `/api/health` remains public. The browser sends the cookie using credentialed requests, so `CORS_ORIGIN` must match the frontend origin exactly. `AUTH_COOKIE_SAME_SITE` defaults to `lax`; use `none` with HTTPS for cross-site frontend/API deployments. Cookie deletion uses the same configured attributes.

Self-registration creates parent accounts only. Existing accounts without a password hash cannot sign in until an administrator provisions credentials through a dedicated invitation/reset flow.

## Verification

```powershell
npm run build
```

This validates TypeScript and creates production builds. A running PostgreSQL database is required only for migrations and database-backed API features.
