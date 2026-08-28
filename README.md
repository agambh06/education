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
