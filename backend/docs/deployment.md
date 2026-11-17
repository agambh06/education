# Express backend deployment

## Current production deployment

The existing `education-8mju` Vercel project deploys this repository from its root.
The API implementation is built from `backend/`; `api/index.mjs` exports the
compiled Express app from `backend/dist/app.js`. Vercel owns the HTTP listener,
so this entry point does not run `npm start` or open a separate port.

- Website: https://education-8mju.vercel.app/
- Frontend API base URL: https://education-8mju.vercel.app/api
- Health endpoint: https://education-8mju.vercel.app/api/health

Use the [root deployment instructions](../../README.md#production-on-vercel)
for the project's build settings and environment variables. Keep the root
directory at the repository root so the function adapter and both lockfiles are
included. The backend build generates Prisma Client before compiling TypeScript;
it does not apply database migrations.

Configure `CORS_ORIGIN=https://education-8mju.vercel.app` and `VITE_API_URL=/api`
in the hosting provider's environment settings. Vercel supplies `NODE_ENV` for
production. A database URL is unnecessary for the current demo routes. Store
`DATABASE_URL` server-side when enabling database-backed features; do not commit
credentials or expose them through frontend variables.

The existing production API was verified on 2026-11-17 at commit
`2472e61bbc8ae3a550d3aed57dbf625d6cf1d06c`: an anonymous HTTPS health request
returned HTTP 200 and `{"status":"ok"}`. Health checks confirm HTTP availability,
not database readiness. Preview and generated deployment URLs may require Vercel
authentication; verify public availability using the stable production domain
without cookies or a protection bypass.

## Hosts that run a standalone Node server

For a host that expects a long-running process, set its service root to
`backend/` and use:

| Setting | Value |
| --- | --- |
| Runtime | Node.js 24 |
| Install | `npm ci --include=dev` |
| Build | `npm run build` |
| Start | `npm start` |
| Health path | `/api/health` |

`npm start` runs `node dist/server.js`, which listens on the host's `PORT`
(default `4000`). Set `NODE_ENV=production` and `CORS_ORIGIN` to the frontend's
HTTPS origin. Supply these through the host's environment settings. Development
dependencies are needed during the build for Prisma generation and TypeScript;
they may be pruned afterward with `npm prune --omit=dev`.

Enable HTTPS on the host and configure the frontend's `VITE_API_URL` to the
resulting HTTPS URL ending in `/api`, then rebuild the frontend. This standalone
configuration is an alternative to the current Vercel deployment.

## Verification

From the repository root after installing dependencies:

```powershell
npm --prefix backend run build
npm run test:backend-deployment
```

The deployment suite checks the compiled Vercel adapter, JSON responses, CORS,
environment validation, build ordering, and the real `npm start` command on an
available port. The startup check overrides local environment files and uses no
database. CI runs it after the backend production build.

To check anonymous production availability from a terminal, use:

```powershell
curl.exe --fail-with-body -i https://education-8mju.vercel.app/api/health
```

Expect HTTP 200, a JSON content type, and `{"status":"ok"}`. A login page or
redirect does not satisfy public health availability. Also verify a read-only
request to `/api/assignments?studentId=noa`, an `Origin` header matching the
frontend, and a JSON 404 at `/api/missing` as described in the root guide.

Current assignment/exam data is an in-memory demo and can reset between instances
or deployments. Parent-link routes deny access until trusted authentication is
connected. Database provisioning and migrations follow the separate
[database deployment guidance](../../README.md#database-deployment-status).
