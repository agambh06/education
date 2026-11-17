# Parent learning progress dashboard

The parent overview is read-only and uses a dedicated aggregate API. It never
uses the existing, unscoped demo assignment/exam endpoints as parent data.
There is no automatic fallback to sample children. The user can explicitly open
an isolated, labeled demo with two fictional children, including one with no
activity. Demo data is never sent to the API or persisted.

## Current integration status

The authentication, verified parent linking, persisted practice (#31), and
progress (#32) prerequisites are not implemented on `main`. The two endpoints
below are the frontend integration contract, **not existing backend routes**.
Until they exist, the overview shows an unavailable state; it does not grant
access through the role selector or the old mock parent record.

## Required API contract

All requests use the configured API base URL, session credentials, and
`cache: "no-store"`. Responses must also use `Cache-Control: private, no-store`.
Use same-origin session authentication in production. A separate API origin
requires explicitly allowed credentialed CORS and a compatible cookie policy.

`GET /api/parent/children` returns only children with **verified, active links to
the authenticated parent**:

```json
{
  "children": [
    { "id": "child-1", "firstName": "שם", "lastName": "משפחה" }
  ]
}
```

No links returns `{ "children": [] }`. A role or parent ID supplied by the
browser must never authorize access.

`GET /api/parent/children/:childId/learning-progress` must independently check
the authenticated parent's active verified link on **every request**, including
after revocation. Return `401` for no authenticated session and `403` for denied
access. The response contains only aggregate recorded practice:

```json
{
  "childId": "child-1",
  "activity": {
    "sessionCount": 4,
    "questionCount": 28,
    "practiceMinutes": 65,
    "lastPracticedAt": "2026-11-10T15:00:00Z"
  },
  "exams": [
    {
      "id": "exam-1",
      "subject": "מתמטיקה",
      "title": "שברים",
      "scheduledAt": "2026-11-18T08:00:00Z",
      "topics": [
        { "id": "topic-1", "title": "חיבור שברים", "practiceCount": 6, "needsReview": true }
      ]
    }
  ]
}
```

Counts are nonnegative integers, dates are valid timestamps, and IDs are unique
within their lists. No practice uses zero counts and `lastPracticedAt: null`;
no upcoming exams uses `exams: []`. The backend must derive `needsReview` from
recorded practice using the progress feature's rules, rather than inferred
grades. Never include raw answers, uploaded material, private notes, messages,
grades, or study-plan editing capabilities.

The frontend copies only allowed aggregate fields, validates responses and the
returned child ID, and rechecks the child list on selection/refresh and when the
page regains focus. A failed request removes previously displayed data; stale
or aborted requests cannot restore it. Server authorization remains mandatory.

The displayed estimate is the percentage of exam topics practiced at least
once. It is not mastery, a grade, or a prediction of exam performance. The UI
states this limitation and only includes activity recorded in the app.

## Verification

Run `npm --prefix frontend run test:parent-progress` for service, dashboard,
and state-transition tests. Run the frontend production build for TypeScript
and bundling checks. No database is needed for these frontend tests.
