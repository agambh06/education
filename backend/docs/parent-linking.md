# Verified parent–student linking

This module implements issue #36's persisted invitation and consent lifecycle.
It deliberately ships closed: `createApp()` returns **401** for every
`/api/parent-links` operation until the authentication work in #8 supplies
`createApp({ prisma, resolveUserId })`. The resolver must validate the actual
session and return its immutable User ID. Never implement it by trusting a role
switch, a body/query ID, or an unsigned identity header. With cookie sessions,
the authentication adapter must also enforce CSRF protection for mutations.

There is no sign-in UI or parent dashboard integration in this change. The
existing assignment/exam endpoints remain public synthetic demo endpoints, not
protected student data. Before connecting real records, #9 must protect each
parent progress read using `requireAccess(parentId, studentId)` and define its
minimal progress response. Linking grants no permission to private answers,
learning sources, messages, or arbitrary Student relations. Never cache the
authorization result in a JWT/session or treat a ParentStudent row's existence
as permission. Responses from the linking routes use `Cache-Control: no-store`.

## Consent policy (parent-progress-v1)

Account ownership, age eligibility, and guardianship are separate facts. Both
participants must have a trusted `User.accountVerifiedAt`; authentication alone
does not populate this field. Student profile ownership is resolved through the
unique `Student.userId`, and neither a class nor a parent is required.

`Student.parentLinkConsentRequirement` defaults to `UNKNOWN`, which cannot
activate a link. Trusted onboarding/review, outside these public endpoints, may
classify the student as:

- `SELF_CONSENT`: independently verified as eligible to authorize sharing under
  the deployment's reviewed age/jurisdiction policy. Authenticated, explicit
  student approval is still required.
- `GUARDIAN`: requires explicit student assent **and** an independent, current
  `ParentLinkGuardianVerification` for the exact parent/student pair. The proof
  must be issued after this request, carry the trusted reviewer's identifier and
  a private evidence reference, and have a future expiry. A parent asserting
  guardianship, controlling an email, or possessing an invitation is insufficient.

No public endpoint writes classifications or guardian proofs. Unknown ages,
unverified evidence, expired/revoked proofs, and missing policy approval deny
activation. Only the proof recorded during activation can continue to authorize
access; revoking or expiring it blocks the next read. Eligibility and account
verification are checked again on every access. Review the actual age thresholds,
verification provider, evidence retention, student assent text, and consent scope
before enabling this for real minors; this change does not make a jurisdictional
age assumption or itself perform identity/guardian verification.

## API flow

All endpoints require the trusted session resolver, and roles are loaded from
the database on every operation. Tokens travel only in JSON request bodies;
clients and infrastructure must not log them or place them in URLs.

1. The student calls `POST /api/parent-links/invitations` with `{}`. It returns
   `{ token, expiresAt }`, valid for 15 minutes. The 256-bit random secret is
   returned once, and only its SHA-256 hash is stored. A new invitation cancels
   previous unused invitations for that student. Share it privately with the
   intended parent.
2. The parent calls `POST /api/parent-links/requests` with `{ "token": "..." }`.
   This consumes the invitation and creates a **PENDING** link, valid for 24
   hours, bound to the authenticated parent and the invitation's student. No
   endpoint accepts a student email/ID as a claim. Pending links grant no access.
3. Each participant can `GET /api/parent-links` to list only their own link
   metadata and the parent's registered first/last name. The student must
   independently confirm the parent and agree to progress sharing; a future UI
   must clearly present that identity and scope.
4. The owning student calls `POST /api/parent-links/:id/approve` with
   `{ "consent": true }`. The server verifies ownership, both accounts, request
   expiry, and trusted consent eligibility. On success it records **VERIFIED**,
   who/when approved, the consent version, and the guardian proof reference when
   required. A parent cannot approve their own request. Repeating valid approval
   is idempotent and preserves the original verification timestamp.
   Approval clears the request expiry; an active link lasts until revoked or
   its trusted account/consent/guardian eligibility ceases to be valid.
5. Either participant can `DELETE /api/parent-links/:id` to set **REVOKED**.
   Repetition is idempotent. Outstanding student invitations and this pair's
   guardian proofs are also revoked. The next `requireAccess` denies access.
   Re-linking requires a fresh invitation, request, approval, and fresh guardian
   verification if required; the request ID changes so old approvals cannot act
   on the new request.

Consumed tokens return 409; expired/revoked tokens or requests return 410.
Duplicate active/pending pairs return 409 without extending the expiry or
consuming the new invitation. Missing or unrelated link IDs return 404. Invalid
payloads return 400; missing sessions return 401; role/consent/access failures
return 403. Serializable transactions with bounded conflict retries make
redemption, approval, and revocation atomic across server instances.

## Storage and validation

Use the [versioned baseline/upgrade instructions](../prisma/README.md).
Existing bare ParentStudent relations are not evidence of consent and are
revoked by the upgrade; existing users, students and school data are preserved.
No migration is automatically run on application startup.

Run `npm --prefix backend test` for HTTP validation/forgery regressions, and
`npm run test:integration` with the documented isolated test database for the
actual persisted lifecycle, guardian requirements, revocation, expiry, and
concurrent redemption tests. These checks do not substitute for integrating and
testing the real authentication/verification providers.
