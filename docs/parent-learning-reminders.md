# Parent learning reminders

Issue #38 introduces a staged foundation for opt-in parent reminders. It defines
preferences and a testable eligibility policy, while keeping delivery unavailable.
The persisted [parent-link lifecycle](../backend/docs/parent-linking.md) now
exists and supplies the shared access checks. A trusted authentication provider,
the permitted topic activity aggregates from issue #32, and their reminder
integration remain gated. The parent progress frontend defines an aggregate
contract and an explicit fictional demo; it does not supply authorized reminder
activity. Role and demo child selection do not establish identity or access rights.

## Availability and channels

Email, push, and in-app delivery are all disabled. No scheduler or transport is
implemented or selected. `GET /api/parent-reminders/status` reports that reminders
are unavailable; it exposes no parent, child, preference, or learning data.
`GET` and `PUT /api/parent-reminders/children/:studentId/preferences` return HTTP
401 until a trusted server session is available. Responses are marked `no-store`.
Headers, query parameters, request bodies, and demo roles must never establish a
parent identity or prove that a parent-child link is verified.

This work does not claim privacy approval or authorize production delivery.
Policy evaluation produces internal candidates only. It does not send messages,
schedule work, or write learning activity.

## Consent and link lifecycle

Upcoming-exam and low-activity reminders are separate preferences. Both default
to off for each verified parent-child link. Preferences include a saved IANA time
zone, defaulting to `Asia/Jerusalem`; eligibility uses that saved time zone.

The Prisma preference model is tied to both the link request ID and its
`verifiedAt` epoch. A preference from an earlier request or verification cannot
become effective after relinking, even if verification timestamps coincide.
Revocation denies preference reads, writes, and policy evaluation. The unlink
API retains a revoked audit record; physical deletion of the link cascades
deletion of its preference. Relinking requires a fresh invitation, request,
verification, and explicit opt-in; it must not restore prior consent.

The schema, additive reminder migration, and Prisma adapter provide persistent
preference storage. Reads and writes reuse the parent-link service's current
account, student assent, consent, and guardian-proof checks in serializable
transactions, alongside reminder sharing scope and consent-epoch checks.
Production requests cannot reach the adapter while the session resolver denies
access. Exam and activity sharing scopes default to false; saving a reminder
preference cannot grant those scopes or bypass the linking lifecycle.

Apply the tracked migrations using the
[baseline and upgrade guide](../backend/prisma/README.md). The reminder migration
adds opt-in storage and disabled sharing scopes; it does not verify an existing
link, change existing verification evidence, or opt any parent in.

## Eligibility policy

Every candidate requires the relevant explicit opt-in, a currently active verified
parent-child link, and valid data authorized for that link. Missing or invalid
inputs suppress the candidate.

| Rule | Policy |
| --- | --- |
| Local delivery hours | From 09:00 inclusive to 19:00 exclusive in the saved time zone. |
| Upcoming exam | Published and starts strictly after now, no later than seven days from now: `now < startsAt <= now + 7 days`. |
| Exam duplication | At most one reminder per parent-child link and exam, across both types. |
| Low activity | A known, permitted topic aggregate has an activity count of zero or one in a complete seven-day window. |
| Aggregate freshness | The window ends at or before now and is no more than 24 hours old: `0 <= now - windowEnd <= 24 hours`. |
| Topic scope | The topic belongs to an upcoming published exam for the linked child. |
| Suppression | No data, incomplete windows, stale data, future data, invalid timestamps, and invalid counts produce no reminder. Missing activity is never treated as zero activity. |
| Parent cap | At most two reminders per parent in a rolling seven-day period, across all their children and both types. |
| Parent-child cap | At most one reminder per parent-child link in a rolling seven-day period, across both types. Another parent's history does not consume this link's allowance. |
| Priority | If upcoming-exam reminders are opted in and an eligible exam exists, choose the upcoming-exam candidate before considering low activity. |

Preference, link, consent, and cap checks must be evaluated again before any
future delivery. Durable history and atomic cap enforcement are prerequisites for
production scheduling; an in-memory evaluation result is not delivery history.

## Content and recommendations

Preview text is generic and encouraging. It contains no names, topic names,
grades, answers, or other learning details that could appear on a shared screen.
It must not label a child as falling behind or predict exam readiness.

An internal recommendation may reference a topic ID for a short practice activity,
or suggest planning together. A topic ID is not included in the preview. Any
future destination must authenticate the parent and recheck the active verified
link before revealing permitted details.

## Validation and remaining prerequisites

Run `npm --prefix backend run test:reminders` from the repository root to generate
the Prisma client and run the reminder tests through the existing TypeScript test
runner. The full `npm --prefix backend test` command also includes these tests and
test type checking. No running database or applied migrations are needed.
Preference service tests use an in-memory test store rather than the Prisma adapter.
Run `npm --prefix frontend run test:reminders` for status-service request,
cancellation, and error-handling regressions.

Automated tests cover the policy boundaries and denied access, including opt-out,
link revocation, consent epochs, data freshness, local hours, duplicate exams,
rolling caps, priority, and the lack of a trusted session. The isolated
`npm run test:integration` suite also checks the additive reminder migration and
its disabled defaults, the persisted parent-link lifecycle, and the actual Prisma
reminder preference adapter. Adapter tests cover persistence and reload through
a fresh adapter, separate opt-out, current account/status/consent/guardian checks,
relinking with a new request ID even when verification timestamps coincide,
sharing-scope reset, stale consent write denial, revocation between read and save,
and preference deletion when the link is physically deleted.
Use the dedicated test-database setup in the repository README; never substitute
a personal database. These isolated tests verify reminder storage and its access
checks; they do not establish that real production authentication, delivery,
scheduling, or the complete user flow works.

Before enabling any channel, connect and verify the trusted server session and
existing link lifecycle through the reminder flow, integrate issue #32's
permitted activity aggregates, and apply the tracked migrations. Implement durable
delivery history with atomic cap enforcement, and complete privacy review of the
chosen channel and content. Select and implement a scheduler and transport only
as part of that production work. Verify authentication, revocation, and relinking
through the full production flow before enabling delivery.
