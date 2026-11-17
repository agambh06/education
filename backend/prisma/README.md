# Prisma migrations

This repository previously had a Prisma schema but no tracked migration history.
`20261112000000_baseline` records that original school schema;
`20261112000100_verified_parent_links` upgrades it for verified family linking.
The baseline is required for new databases. Never run it over existing tables.

## Existing database with the original schema

Back up the database first. Confirm that its schema matches the baseline SQL,
including table, enum, index, and foreign-key definitions. If it differs, reconcile
the difference explicitly before proceeding. Use a restored copy to rehearse this
process; do not use `prisma migrate reset` or delete existing school data.

From `backend`, with `DATABASE_URL` pointing at the intended database:

```powershell
npx prisma migrate resolve --applied 20261112000000_baseline
npx prisma migrate deploy
npx prisma generate
```

`migrate resolve` records the baseline as applied without executing its SQL.
Only do this for an existing database that already has the baseline schema.
If the database already has migration history, inspect that history and reconcile
it with these migrations before using these commands; do not overwrite it.

## New empty database

From `backend`, run the following against an empty PostgreSQL database:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Both migrations execute in order. Tests and migration rehearsals must use an
isolated disposable database, never a personal or shared developer database.

## Linking data after the upgrade

Existing users retain their roles and school records. Existing `ParentStudent`
rows retain their composite keys, receive unique migration IDs, and become
`REVOKED`, with an audit marker identifying this migration. Their migration-time
`requestedAt` is not evidence of a historical request. No old association becomes
verified automatically; parents must complete the new linking process.

All student consent requirements begin as `UNKNOWN`; all account-verification
timestamps begin empty. A trusted account-verification process must populate
`accountVerifiedAt` and bind a student account through `Student.userId`.
Only a trusted age/eligibility verification process may set `SELF_CONSENT`;
the public linking API must not accept this choice from the caller. Set `GUARDIAN`
when guardian consent is required and record a scoped, expiring guardian
verification through an authorized verification process. Unknown eligibility
must never grant access.

Invitation records store token hashes only. Audit identifiers (`verifiedById`,
`revokedById`, `consumedById`, and `guardianVerificationId`) are retained as
identifiers rather than foreign keys; do not interpret them as current proof by
themselves. Current status, consent evidence, scope, expiry, and revocation still
need validation in the service.
