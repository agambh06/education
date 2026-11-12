import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { app } from "../src/app.ts";
import {
  evaluateLearningReminder,
  learningReminderDefaults,
} from "../src/modules/notifications/learning-reminders.policy.ts";
import { createLearningRemindersRouter } from "../src/modules/notifications/learning-reminders.routes.ts";
import { LearningReminderPreferencesService } from "../src/modules/notifications/learning-reminders.service.ts";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = new Date("2026-11-11T10:00:00.000Z");
const VERIFIED_AT = "2026-01-01T00:00:00.000Z";
const parentSession = { userId: "parent-1", role: "PARENT" };

function input(overrides = {}) {
  return {
    parentId: "parent-1",
    studentId: "child-1",
    now: new Date(NOW),
    link: {
      parentId: "parent-1",
      studentId: "child-1",
      parentRole: "PARENT",
      verifiedAt: VERIFIED_AT,
      revokedAt: null,
      examsShared: true,
      activityShared: true,
    },
    preferences: {
      upcomingExams: true,
      lowActivity: true,
      timeZone: "Asia/Jerusalem",
      linkVerifiedAt: VERIFIED_AT,
    },
    exams: [
      {
        id: "exam-1",
        studentId: "child-1",
        startsAt: new Date(NOW.getTime() + DAY).toISOString(),
        published: true,
        topicIds: ["topic-1"],
      },
    ],
    activity: [
      {
        studentId: "child-1",
        topicId: "topic-1",
        windowStartedAt: new Date(NOW.getTime() - 7 * DAY).toISOString(),
        windowEndedAt: NOW.toISOString(),
        practiceCount: 1,
      },
    ],
    history: [],
    ...overrides,
  };
}

function lowActivityInput() {
  const value = input();
  value.preferences.upcomingExams = false;
  return value;
}

function history(overrides = {}) {
  return {
    parentId: "parent-1",
    studentId: "other-child",
    kind: "UPCOMING_EXAM",
    examId: "other-exam",
    sentAt: new Date(NOW.getTime() - DAY).toISOString(),
    ...overrides,
  };
}

function memoryStore() {
  const initial = input();
  const state = { link: initial.link, preferences: null, rejectSave: false, saves: 0 };
  return {
    state,
    async read(parentId, studentId) {
      if (state.link?.parentId !== parentId || state.link?.studentId !== studentId) {
        return { link: null, preferences: null };
      }
      return structuredClone({ link: state.link, preferences: state.preferences });
    },
    async saveForVerifiedLink(parentId, studentId, verifiedAt, preferences) {
      state.saves += 1;
      if (
        state.rejectSave ||
        !state.link ||
        state.link.revokedAt !== null ||
        state.link.parentId !== parentId ||
        state.link.studentId !== studentId ||
        state.link.verifiedAt !== verifiedAt ||
        (preferences.upcomingExams && !state.link.examsShared) ||
        (preferences.lowActivity && (!state.link.examsShared || !state.link.activityShared))
      )
        return false;
      state.preferences = { ...structuredClone(preferences), linkVerifiedAt: verifiedAt };
      return true;
    },
  };
}

async function withServer(application, callback) {
  const server = createServer(application);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("a verified opted-in parent receives one generic candidate, with exam priority", () => {
  const candidate = evaluateLearningReminder(input());
  assert.equal(candidate?.kind, "UPCOMING_EXAM");
  assert.equal(candidate.examId, "exam-1");
  assert.deepEqual(candidate.recommendation, { kind: "PLAN_TOGETHER" });
});

test("missing consent, invalid links, and mismatched permission epochs suppress candidates", async (t) => {
  const cases = [
    [
      "no preferences",
      (value) => {
        value.preferences = null;
      },
    ],
    [
      "both preferences off",
      (value) => {
        value.preferences.upcomingExams = false;
        value.preferences.lowActivity = false;
      },
    ],
    [
      "no link",
      (value) => {
        value.link = null;
      },
    ],
    [
      "unverified link",
      (value) => {
        value.link.verifiedAt = null;
      },
    ],
    [
      "malformed verification",
      (value) => {
        value.link.verifiedAt = "invalid";
        value.preferences.linkVerifiedAt = "invalid";
      },
    ],
    [
      "future verification",
      (value) => {
        value.link.verifiedAt = new Date(NOW.getTime() + DAY).toISOString();
        value.preferences.linkVerifiedAt = value.link.verifiedAt;
      },
    ],
    [
      "revoked link",
      (value) => {
        value.link.revokedAt = NOW.toISOString();
      },
    ],
    [
      "another parent",
      (value) => {
        value.link.parentId = "parent-2";
      },
    ],
    [
      "another child",
      (value) => {
        value.link.studentId = "child-2";
      },
    ],
    [
      "teacher link",
      (value) => {
        value.link.parentRole = "TEACHER";
      },
    ],
    [
      "admin link",
      (value) => {
        value.link.parentRole = "ADMIN";
      },
    ],
    [
      "reverified link requires new opt-in",
      (value) => {
        value.link.verifiedAt = "2026-01-02T00:00:00.000Z";
      },
    ],
    [
      "exam sharing denied",
      (value) => {
        value.link.examsShared = false;
      },
    ],
    [
      "invalid saved timezone",
      (value) => {
        value.preferences.timeZone = "Not/A_Time_Zone";
      },
    ],
    [
      "numeric timezone offset",
      (value) => {
        value.preferences.timeZone = "+02:00";
      },
    ],
    [
      "compact numeric timezone offset",
      (value) => {
        value.preferences.timeZone = "-0500";
      },
    ],
    [
      "invalid clock",
      (value) => {
        value.now = new Date("invalid");
      },
    ],
  ];
  for (const [name, change] of cases) {
    await t.test(name, () => {
      const value = input();
      change(value);
      assert.equal(evaluateLearningReminder(value), null);
    });
  }
});

test("each reminder type requires its own opt-in and permitted data", () => {
  const low = lowActivityInput();
  assert.equal(evaluateLearningReminder(low)?.kind, "LOW_ACTIVITY");
  low.link.activityShared = false;
  assert.equal(evaluateLearningReminder(low), null);
  low.preferences.upcomingExams = true;
  assert.equal(evaluateLearningReminder(low)?.kind, "UPCOMING_EXAM");
  low.link.examsShared = false;
  assert.equal(evaluateLearningReminder(low), null);
});

test("delivery hours include 09:00 and exclude 19:00 in the saved timezone", async (t) => {
  const cases = [
    ["Jerusalem before opening", "2026-11-11T06:59:59.999Z", "Asia/Jerusalem", false],
    ["Jerusalem opening", "2026-11-11T07:00:00.000Z", "Asia/Jerusalem", true],
    ["Jerusalem before closing", "2026-11-11T16:59:59.999Z", "Asia/Jerusalem", true],
    ["Jerusalem closing", "2026-11-11T17:00:00.000Z", "Asia/Jerusalem", false],
    ["saved UTC zone", "2026-11-11T07:00:00.000Z", "UTC", false],
    ["New York before opening", "2026-11-11T13:59:59.999Z", "America/New_York", false],
    ["New York opening", "2026-11-11T14:00:00.000Z", "America/New_York", true],
    ["Jerusalem daylight saving opening", "2026-06-11T06:00:00.000Z", "Asia/Jerusalem", true],
  ];
  for (const [name, now, timeZone, eligible] of cases) {
    await t.test(name, () => {
      const value = input({ now: new Date(now) });
      value.preferences.timeZone = timeZone;
      value.exams[0].startsAt = new Date(value.now.getTime() + DAY).toISOString();
      assert.equal(evaluateLearningReminder(value) !== null, eligible);
    });
  }
});

test("published upcoming exams use strict now and inclusive seven-day boundaries", async (t) => {
  for (const [offset, eligible] of [
    [-1, false],
    [0, false],
    [1, true],
    [7 * DAY, true],
    [7 * DAY + 1, false],
  ]) {
    await t.test(`exam starts ${offset}ms after now`, () => {
      const value = input();
      value.exams[0].startsAt = new Date(NOW.getTime() + offset).toISOString();
      assert.equal(evaluateLearningReminder(value) !== null, eligible);
    });
  }
  for (const change of [
    (exam) => {
      exam.published = false;
    },
    (exam) => {
      exam.studentId = "other-child";
    },
    (exam) => {
      exam.startsAt = "invalid";
    },
  ]) {
    const value = input();
    change(value.exams[0]);
    assert.equal(evaluateLearningReminder(value), null);
  }
});

test("exam selection is deterministic and does not mutate caller data", () => {
  const value = input();
  const first = { ...value.exams[0], id: "exam-b" };
  const earlier = { ...first, id: "exam-a", startsAt: new Date(NOW.getTime() + DAY / 2).toISOString() };
  value.exams = [first, earlier];
  const before = structuredClone(value);
  assert.equal(evaluateLearningReminder(value)?.examId, "exam-a");
  assert.deepEqual(value, before);
});

test("parent and child rolling caps cover both reminder types and all children", () => {
  const value = input({ history: [history(), history({ studentId: "third-child", kind: "LOW_ACTIVITY" })] });
  assert.equal(evaluateLearningReminder(value), null);
  value.history = [history({ studentId: "child-1", kind: "LOW_ACTIVITY", examId: "previous-exam" })];
  assert.equal(evaluateLearningReminder(value), null);
  value.history = [history({ kind: "LOW_ACTIVITY" })];
  assert.equal(evaluateLearningReminder(value)?.kind, "UPCOMING_EXAM");
  value.preferences.upcomingExams = false;
  value.history.push(history({ studentId: "third-child" }));
  assert.equal(evaluateLearningReminder(value), null);
});

test("rolling cooldown expires exactly seven days after delivery", () => {
  const value = input({
    history: [history({ studentId: "child-1", sentAt: new Date(NOW.getTime() - 7 * DAY + 1).toISOString() })],
  });
  assert.equal(evaluateLearningReminder(value), null);
  value.history[0].sentAt = new Date(NOW.getTime() - 7 * DAY).toISOString();
  assert.equal(evaluateLearningReminder(value)?.kind, "UPCOMING_EXAM");
  value.history = [history({ parentId: "other-parent", studentId: "child-1" })];
  assert.equal(evaluateLearningReminder(value)?.kind, "UPCOMING_EXAM");
});

test("an exam is never repeated even after the rolling cooldown has expired", () => {
  const value = input({
    history: [
      history({ studentId: "child-1", examId: "exam-1", sentAt: new Date(NOW.getTime() - 8 * DAY).toISOString() }),
    ],
  });
  assert.equal(evaluateLearningReminder(value), null);
  value.preferences.upcomingExams = false;
  assert.equal(evaluateLearningReminder(value), null);
});

test("invalid or future delivery history suppresses eligibility", () => {
  for (const sentAt of ["invalid", new Date(NOW.getTime() + 1).toISOString()]) {
    assert.equal(evaluateLearningReminder(input({ history: [history({ sentAt })] })), null);
  }
});

test("low activity requires a known zero or one count in a complete seven-day window", async (t) => {
  for (const [practiceCount, eligible] of [
    [0, true],
    [1, true],
    [2, false],
    [-1, false],
    [0.5, false],
    [NaN, false],
    [Infinity, false],
    [null, false],
    ["0", false],
  ]) {
    await t.test(`practice count ${String(practiceCount)}`, () => {
      const value = lowActivityInput();
      value.activity[0].practiceCount = practiceCount;
      assert.equal(evaluateLearningReminder(value) !== null, eligible);
    });
  }
  for (const offset of [-1, 1]) {
    const value = lowActivityInput();
    value.activity[0].windowStartedAt = new Date(NOW.getTime() - 7 * DAY + offset).toISOString();
    assert.equal(evaluateLearningReminder(value), null);
  }
  assert.equal(evaluateLearningReminder({ ...lowActivityInput(), activity: [] }), null);
});

test("low activity rejects stale, future, invalid, and unrelated aggregates", async (t) => {
  const cases = [
    ["exact freshness boundary", DAY, true],
    ["stale by one millisecond", DAY + 1, false],
    ["future window", -1, false],
  ];
  for (const [name, age, eligible] of cases) {
    await t.test(name, () => {
      const value = lowActivityInput();
      value.activity[0].windowEndedAt = new Date(NOW.getTime() - age).toISOString();
      value.activity[0].windowStartedAt = new Date(NOW.getTime() - age - 7 * DAY).toISOString();
      assert.equal(evaluateLearningReminder(value) !== null, eligible);
    });
  }
  for (const change of [
    (activity) => {
      activity.windowStartedAt = "invalid";
    },
    (activity) => {
      activity.windowEndedAt = "invalid";
    },
    (activity) => {
      activity.studentId = "other-child";
    },
    (activity) => {
      activity.topicId = "unrelated-topic";
    },
  ]) {
    const value = lowActivityInput();
    change(value.activity[0]);
    assert.equal(evaluateLearningReminder(value), null);
  }
  for (const change of [
    (exam) => {
      exam.published = false;
    },
    (exam) => {
      exam.startsAt = NOW.toISOString();
    },
    (exam) => {
      exam.startsAt = new Date(NOW.getTime() + 8 * DAY).toISOString();
    },
  ]) {
    const value = lowActivityInput();
    change(value.exams[0]);
    assert.equal(evaluateLearningReminder(value), null);
  }
});

test("shared-device previews contain no private learning data or internal identifiers", () => {
  const value = lowActivityInput();
  value.studentId = "sensitive-child-id";
  value.link.studentId = value.studentId;
  value.exams[0] = {
    ...value.exams[0],
    studentId: value.studentId,
    id: "sensitive-exam-id",
    title: "Sensitive Exam Title",
    topicIds: ["sensitive-topic-id"],
  };
  value.activity[0] = {
    ...value.activity[0],
    studentId: value.studentId,
    topicId: "sensitive-topic-id",
    studentName: "Sensitive Child Name",
    topicName: "Sensitive Topic Name",
    answer: "Sensitive Answer",
    grade: 17,
  };
  const low = evaluateLearningReminder(value);
  assert.deepEqual(low.recommendation, { kind: "SHORT_TOPIC_PRACTICE", topicId: "sensitive-topic-id" });
  const preview = JSON.stringify(low.preview);
  for (const sensitive of [value.studentId, value.exams[0].id, "Sensitive", "sensitive-topic-id", "17"]) {
    assert.equal(preview.includes(sensitive), false);
  }
  value.preferences.upcomingExams = true;
  assert.deepEqual(evaluateLearningReminder(value).preview, low.preview);
});

test("preference defaults are off and opt-in, opt-out, and reload retain separate choices", async () => {
  const store = memoryStore();
  const service = new LearningReminderPreferencesService(store);
  assert.deepEqual(await service.getPreferences(parentSession, "child-1"), learningReminderDefaults);
  const optedIn = { upcomingExams: true, lowActivity: false, timeZone: "America/New_York" };
  assert.deepEqual(await service.savePreferences(parentSession, "child-1", optedIn), optedIn);
  assert.deepEqual(
    await new LearningReminderPreferencesService(store).getPreferences(parentSession, "child-1"),
    optedIn,
  );
  const optedOut = { ...optedIn, upcomingExams: false };
  await service.savePreferences(parentSession, "child-1", optedOut);
  assert.deepEqual(await service.getPreferences(parentSession, "child-1"), optedOut);
});

test("preference reads and writes require a parent and that parent's active verified link", async () => {
  const store = memoryStore();
  const service = new LearningReminderPreferencesService(store);
  for (const [session, status] of [
    [null, 401],
    [{ userId: "parent-1", role: "TEACHER" }, 403],
    [{ userId: "parent-1", role: "ADMIN" }, 403],
    [{ userId: "other-parent", role: "PARENT" }, 403],
  ]) {
    await assert.rejects(service.getPreferences(session, "child-1"), { status });
    await assert.rejects(service.savePreferences(session, "child-1", learningReminderDefaults), { status });
  }
  store.state.link.revokedAt = NOW.toISOString();
  await assert.rejects(service.getPreferences(parentSession, "child-1"), { status: 403 });
  await assert.rejects(service.savePreferences(parentSession, "child-1", learningReminderDefaults), { status: 403 });
  store.state.link = null;
  await assert.rejects(service.getPreferences(parentSession, "child-1"), { status: 403 });
  await assert.rejects(service.savePreferences(parentSession, "child-1", learningReminderDefaults), { status: 403 });
  assert.equal(store.state.saves, 0);
});

test("reverification and relinking cannot restore consent from an earlier link epoch", async () => {
  const store = memoryStore();
  const service = new LearningReminderPreferencesService(store);
  const optedIn = { upcomingExams: true, lowActivity: true, timeZone: "UTC" };
  await service.savePreferences(parentSession, "child-1", optedIn);
  const oldLink = structuredClone(store.state.link);
  store.state.link = null;
  await assert.rejects(service.getPreferences(parentSession, "child-1"), { status: 403 });
  store.state.link = { ...oldLink, verifiedAt: "2026-01-02T00:00:00.000Z" };
  assert.deepEqual(await service.getPreferences(parentSession, "child-1"), learningReminderDefaults);
  await service.savePreferences(parentSession, "child-1", optedIn);
  assert.deepEqual(await service.getPreferences(parentSession, "child-1"), optedIn);
});

test("future link verification cannot authorize preference reads or writes", async () => {
  const store = memoryStore();
  store.state.link.verifiedAt = new Date(Date.now() + DAY).toISOString();
  const service = new LearningReminderPreferencesService(store);
  await assert.rejects(service.getPreferences(parentSession, "child-1"), { status: 403 });
  await assert.rejects(service.savePreferences(parentSession, "child-1", learningReminderDefaults), { status: 403 });
  assert.equal(store.state.saves, 0);
});

test("sharing revocation masks saved preferences and prevents new opt-ins", async () => {
  const store = memoryStore();
  const service = new LearningReminderPreferencesService(store);
  const optedIn = { upcomingExams: true, lowActivity: true, timeZone: "UTC" };
  await service.savePreferences(parentSession, "child-1", optedIn);
  store.state.link.activityShared = false;
  assert.deepEqual(await service.getPreferences(parentSession, "child-1"), { ...optedIn, lowActivity: false });
  await assert.rejects(service.savePreferences(parentSession, "child-1", optedIn), { status: 403 });
  store.state.link.examsShared = false;
  assert.deepEqual(await service.getPreferences(parentSession, "child-1"), {
    ...optedIn,
    upcomingExams: false,
    lowActivity: false,
  });
  await assert.rejects(service.savePreferences(parentSession, "child-1", { ...optedIn, lowActivity: false }), {
    status: 403,
  });
});

test("a link change between preference read and atomic save denies the write", async () => {
  const store = memoryStore();
  store.state.rejectSave = true;
  const service = new LearningReminderPreferencesService(store);
  await assert.rejects(
    service.savePreferences(parentSession, "child-1", { upcomingExams: true, lowActivity: false, timeZone: "UTC" }),
    { status: 403 },
  );
  assert.equal(store.state.preferences, null);
  assert.equal(store.state.saves, 1);
});

test("strict preference validation rejects malformed values and identity fields", async () => {
  const store = memoryStore();
  const service = new LearningReminderPreferencesService(store);
  for (const invalid of [
    {},
    { ...learningReminderDefaults, upcomingExams: "true" },
    { ...learningReminderDefaults, lowActivity: null },
    { ...learningReminderDefaults, timeZone: "Not/A_Time_Zone" },
    { ...learningReminderDefaults, timeZone: "+02:00" },
    { ...learningReminderDefaults, timeZone: "-0500" },
    { ...learningReminderDefaults, parentId: "another-parent" },
    { ...learningReminderDefaults, studentId: "another-child" },
    { ...learningReminderDefaults, verifiedAt: VERIFIED_AT },
  ]) {
    await assert.rejects(service.savePreferences(parentSession, "child-1", invalid));
  }
  assert.equal(store.state.saves, 0);
});

test("production capability is public and disabled, and spoofed identity never opens preferences", async () => {
  await withServer(app, async (baseUrl) => {
    const statusResponse = await fetch(`${baseUrl}/api/parent-reminders/status`);
    assert.equal(statusResponse.status, 200);
    assert.equal(statusResponse.headers.get("cache-control"), "no-store");
    const status = await statusResponse.json();
    assert.equal(status.settingsAvailable, false);
    assert.equal(status.deliveryEnabled, false);
    assert.deepEqual(status.defaults, learningReminderDefaults);
    assert.equal(JSON.stringify(status).includes("child-1"), false);
    const url = `${baseUrl}/api/parent-reminders/children/child-1/preferences?parentId=parent-1&role=PARENT`;
    const headers = {
      "content-type": "application/json",
      "x-user-id": "parent-1",
      "x-parent-id": "parent-1",
      "x-user-role": "PARENT",
      authorization: "Bearer parent-1",
    };
    assert.equal((await fetch(url, { headers })).status, 401);
    assert.equal(
      (
        await fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify({ ...learningReminderDefaults, parentId: "parent-1", role: "PARENT" }),
        })
      ).status,
      401,
    );
  });
});

test("trusted route adapters can read and update only validated preferences for the session parent", async () => {
  const store = memoryStore();
  const application = express();
  application.use(express.json());
  application.use(
    "/api/parent-reminders",
    createLearningRemindersRouter({
      service: new LearningReminderPreferencesService(store),
      resolveSession: () => parentSession,
    }),
  );
  await withServer(application, async (baseUrl) => {
    const url = `${baseUrl}/api/parent-reminders/children/child-1/preferences`;
    const read = await fetch(url);
    assert.equal(read.status, 200);
    assert.equal(read.headers.get("cache-control"), "no-store");
    assert.deepEqual(await read.json(), { ...learningReminderDefaults, deliveryEnabled: false });
    const values = { upcomingExams: true, lowActivity: false, timeZone: "UTC" };
    const saved = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { ...values, deliveryEnabled: false });
    assert.deepEqual(await (await fetch(url)).json(), { ...values, deliveryEnabled: false });
    const invalid = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, parentId: "other-parent" }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await fetch(`${baseUrl}/api/parent-reminders/children/other-child/preferences`)).status, 403);
    store.state.link.revokedAt = NOW.toISOString();
    assert.equal((await fetch(url)).status, 403);
    assert.equal(
      (
        await fetch(url, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        })
      ).status,
      403,
    );
  });
});
