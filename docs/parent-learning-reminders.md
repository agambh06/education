# Parent learning reminders

Issue #38 introduces a staged foundation for opt-in parent reminders. It defines
preferences and a testable eligibility policy, while keeping delivery unavailable.
Authentication, active verified parent-child links, and the permitted topic
activity aggregates from issue #32 are not yet integrated into this application.
The existing role switch and student selection are demo controls and do not
establish identity or access rights.

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

The Prisma preference model is tied to the link's `verifiedAt` epoch. A preference
from an earlier verification cannot become effective after reverification.
Revocation denies preference reads, writes, and policy evaluation. Unlinking
cascades deletion of the preference. Relinking requires verification and a fresh
explicit opt-in; it must not restore prior consent.

The schema and Prisma adapter provide persistent preference storage. The adapter
rechecks link verification and permissions in a serializable transaction before
writing. Production requests cannot reach it while the session resolver denies
access. Database integration remains unverified until trusted identity and the
verified-link lifecycle are connected.

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
Preference tests use an in-memory test store rather than the Prisma adapter.
Run `npm --prefix frontend run test:reminders` for status-service request,
cancellation, and error-handling regressions.

Automated tests cover the policy boundaries and denied access, including opt-out,
link revocation, data freshness, local hours, duplicate exams, rolling caps,
priority, and the lack of a trusted session. These tests do not establish that
database persistence, delivery, scheduling, or end-to-end consent works.
Database integration tests are deferred until the database-backed identity and
link lifecycle exist.

Before enabling any channel, complete the trusted server session and verified
link integration, issue #32's permitted activity aggregates, database integration
and migrations, durable delivery history with atomic cap enforcement, and privacy
review of the chosen channel and content. Select and implement a scheduler and
transport only as part of that production work. Verify revocation and unlinking
through the full flow before enabling delivery.
