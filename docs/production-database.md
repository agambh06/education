# Production PostgreSQL

## Target and current status

Issue: [#6](https://github.com/agambh06/education/issues/6).
Backend host: Vercel team `agam22`, project `education-8mju`, serving
`https://education-8mju.vercel.app/api`. The separate `education` Vercel project
is not the target for this database.

The selected provider is Neon Postgres through Vercel Marketplace. As of
2026-11-17, the existing project has no database integration or `DATABASE_URL`.
Provisioning is prepared at Neon's Marketplace terms screen and awaits account
owner acceptance. No production database, applied production migration, or live
database connection is claimed by this document. The commands below are the
remaining operator procedure, not a completion record.

Local rehearsal on 2026-11-17 used disposable PostgreSQL 16: all three tracked
migrations applied successfully, a second deploy had no pending migrations,
status reported up to date, and the compiled `db:check` command passed. The
compiled Express entry point returned readiness 200 against that database and
a generic 503 when configuration was removed, while liveness stayed 200.
These results verify the release tooling; production verification remains pending.

## Provision and scope credentials

1. In Vercel team `agam22` → Storage, choose Neon. The account owner must review
   and accept the displayed Vercel Marketplace and Neon terms. Select a suitable
   region near the Vercel function and review the displayed plan/limits before
   creation. Do not select a paid plan without an agreed spending limit.
2. Name the database `education-production`. Connect it only to project
   `education-8mju`, **Production** environment. Do not connect production data
   to Preview or Development; use a separate database/branch with synthetic data
   for those environments. Never clone real student data into a preview.
3. Let the integration supply `DATABASE_URL` as a server-only encrypted secret.
   Use the provider's pooled TLS URL for function traffic. For this Prisma 6
   project, no additional Neon driver or ORM is needed.
4. Keep the provider's direct (non-pooled) TLS URL available only to the trusted
   migration operator. Supply it as `DATABASE_URL` for migration commands.
   There is no second required Prisma environment variable. Never put either
   URL in a `VITE_` variable, command argument, log, screenshot, or tracked file.
5. Rebuild/redeploy after configuring the Production secret so a new deployment
   receives it. The backend build runs `prisma generate` before TypeScript.

Use the provider/Vercel secret manager or a protected operator environment to
inject credentials. If a local environment file is necessary, use an ignored
`.env.production.local` and remove it afterward; it is not loaded automatically
by Prisma or these standalone commands. Do not print it or commit it. Prisma
commands run from `backend` and may also load `backend/.env`; confirm the target
project and database in the provider console before running them.

## Apply migrations

Back up any existing database first. Inspect migration history and tables before
running commands. For existing baseline tables, follow the
[baseline reconciliation procedure](../backend/prisma/README.md); never mark a
baseline applied on an empty database. For a newly provisioned empty database,
inject its direct URL into the operator environment and run from the repository root:

```powershell
npm run prisma:migrate:deploy
npm run prisma:migrate:status
npm --prefix backend run build
npm run db:check
```

Expected migration history, in order:

1. `20261112000000_baseline`
2. `20261112000100_verified_parent_links`
3. `20261117000000_learning_reminder_preferences`

The deploy must exit successfully; status must report up to date; `db:check`
must report verified connectivity, schema, and migrations. It exits nonzero with
a generic message if the database is missing, inaccessible, incomplete, or has
an unresolved failed migration. Resolve failures using Prisma's documented
recovery process after investigating; do not bypass them with `db push`,
`migrate reset`, or an unverified `migrate resolve`.

Migrations are an explicit release operation, not part of ordinary Vercel builds:
preview builds must not mutate production. Apply compatible migrations once
before promoting the application release. No seed or synthetic user data is
required in production.

## Verify the deployed backend

Switch the operator check to the pooled runtime URL and rerun `npm run db:check`.
Deploy the reviewed branch with the Production secret, preserving existing
Vercel Deployment Protection. Use an authenticated request when protection is
enabled. Check:

- `/api/health` → HTTP 200 JSON `{"status":"ok"}` (process liveness).
- `/api/health/ready` → HTTP 200 JSON `{"status":"ok"}` (real Prisma connection
  and required schema columns); missing/unreachable DB → generic HTTP 503.
- `/api/assignments?studentId=noa` still returns the existing demo array.

Readiness probes run `SELECT 1` and zero-row schema queries, without loading
personal records. The operator check also compares successful migration records
with tracked migration directories. Neither check enables parent authentication,
sharing, reminders, or assignment persistence.

## Backup and recovery

Before introducing real records, the owner must set and document a recovery
window and backup policy supported by the selected Neon plan. Inspect the actual
restore retention in the provider dashboard; do not assume a free plan supplies
long-term backups. Take a provider snapshot/restore point before each schema
release and keep separately encrypted logical backups when required by the
chosen recovery policy. Restrict backup access like production credentials.

Rehearse recovery into a **separate** Neon branch/database. Restore the selected
backup/point in time there, run migration status and the read-only database check,
and verify authorized application flows. Confirm data and migration history
before any cutover. To cut over, update the Vercel Production secret to the
verified target and redeploy; preserve the former database until the owner has
confirmed recovery. Reverting application code does not reverse schema changes.
Use a reviewed forward migration for corrections, and never reset production.

Record the actual provider resource, region, plan, retention, migration results,
deployment ID, and readiness result here after provisioning and verification.
Exclude credentials and personal data from that record.

Provider connection guidance: [Neon pooled versus direct connections](https://neon.com/docs/guides/prisma#why-two-connection-strings).
That current guide's installation examples target Prisma 7; this repository stays
on its existing locked Prisma 6 client and uses the commands above.
