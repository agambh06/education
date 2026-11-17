import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "vite";

async function loadModule(entry) {
  const result = await build({
    configFile: false,
    envFile: false,
    root: fileURLToPath(new URL("../", import.meta.url)),
    logLevel: "silent",
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify("/api"),
      "import.meta.env.DEV": "false",
    },
    build: {
      write: false,
      minify: false,
      lib: { entry: fileURLToPath(new URL(entry, import.meta.url)), formats: ["es"] },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  const code = output.find((item) => item.type === "chunk").code;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const { parentProgressService } = await loadModule("../src/services/parentProgressService.ts");
const { parentProgressDemo } = await loadModule("../src/data/parentProgressDemo.ts");
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const children = [
  { id: "child-1", firstName: "First", lastName: "Child" },
  { id: "child-2", firstName: "Second", lastName: "Child" },
];
const progress = {
  childId: "child-1",
  activity: { sessionCount: 3, questionCount: 12, practiceMinutes: 30, lastPracticedAt: "2026-11-10T10:00:00Z" },
  exams: [
    {
      id: "exam-1",
      subject: "Math",
      title: "Fractions",
      scheduledAt: "2026-11-18T10:00:00Z",
      topics: [{ id: "topic-1", title: "Adding fractions", practiceCount: 4, needsReview: true }],
    },
  ],
};

function respond(body, status = 200) {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
}

test("linked children requests are credentialed, uncached, cancellable, and aggregate-only", async () => {
  const calls = [];
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        children: children.map((child) => ({ ...child, privateNotes: "must not reach the dashboard" })),
        parentMessages: ["private"],
      }),
    );
  };
  assert.deepEqual(await parentProgressService.listChildren(controller.signal), children);
  assert.equal(calls[0].url, "/api/parent/children");
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.signal, controller.signal);
});

test("progress requests encode the selected child and retain only aggregate fields", async () => {
  const childId = "child /?1";
  const expected = { ...progress, childId };
  const response = structuredClone(expected);
  response.rawAnswers = [{ answer: "private" }];
  response.activity.privateNotes = "private";
  response.exams[0].studyMaterial = "private";
  response.exams[0].topics[0].messages = ["private"];
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify(response));
  };
  assert.deepEqual(await parentProgressService.getProgress(childId), expected);
  assert.equal(request.url, "/api/parent/children/child%20%2F%3F1/learning-progress");
  assert.equal(request.options.credentials, "include");
  assert.equal(request.options.cache, "no-store");
});

test("empty linked children and a child's first-practice state stay empty", async () => {
  respond({ children: [] });
  assert.deepEqual(await parentProgressService.listChildren(), []);
  const empty = {
    childId: "child-1",
    activity: { sessionCount: 0, questionCount: 0, practiceMinutes: 0, lastPracticedAt: null },
    exams: [],
  };
  respond(empty);
  assert.deepEqual(await parentProgressService.getProgress("child-1"), empty);
});

for (const status of [401, 403, 404, 500]) {
  test(`HTTP ${status} preserves the denial/unavailable status without demo fallback`, async () => {
    // The response body may contain private details and must never be parsed on failure.
    globalThis.fetch = async () => new Response("private failure body; deliberately not JSON", { status });
    for (const load of [
      () => parentProgressService.listChildren(),
      () => parentProgressService.getProgress("child-1"),
    ]) {
      await assert.rejects(load, (error) => error.name === "ApiError" && error.status === status);
    }
  });
}

test("network failures propagate without replacing live data with examples", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Network unavailable");
  };
  await assert.rejects(() => parentProgressService.listChildren(), /Network unavailable/);
});

for (const invalid of [
  null,
  {},
  { children: null },
  { children: [{ id: "child-1" }] },
  { children: [children[0], children[0]] },
]) {
  test(`invalid child-list response is rejected: ${JSON.stringify(invalid)}`, async () => {
    respond(invalid);
    await assert.rejects(() => parentProgressService.listChildren(), { name: "ParentProgressDataError" });
  });
}

const invalidProgress = [
  { ...progress, childId: "other-child" },
  { ...progress, activity: { ...progress.activity, sessionCount: -1 } },
  { ...progress, activity: { ...progress.activity, questionCount: 1.5 } },
  { ...progress, activity: { ...progress.activity, practiceMinutes: "30" } },
  { ...progress, activity: { ...progress.activity, lastPracticedAt: "not a date" } },
  { ...progress, exams: [progress.exams[0], progress.exams[0]] },
  { ...progress, exams: [{ ...progress.exams[0], scheduledAt: "not a date" }] },
  {
    ...progress,
    exams: [{ ...progress.exams[0], topics: [{ ...progress.exams[0].topics[0], needsReview: "true" }] }],
  },
];

for (const [index, invalid] of invalidProgress.entries()) {
  test(`invalid or wrong-child progress is rejected (case ${index + 1})`, async () => {
    respond(invalid);
    await assert.rejects(() => parentProgressService.getProgress("child-1"), { name: "ParentProgressDataError" });
  });
}

test("explicit demo data is isolated, has multiple children, and includes a first-practice state", async () => {
  globalThis.fetch = () => assert.fail("Demo must not request live child data");
  const demoChildren = await parentProgressDemo.listChildren();
  assert.equal(demoChildren.length, 2);
  assert(demoChildren.every((child) => child.id.startsWith("demo-")));
  const active = await parentProgressDemo.getProgress(demoChildren[0].id);
  const empty = await parentProgressDemo.getProgress(demoChildren[1].id);
  assert(active.activity.sessionCount > 0);
  assert(active.exams[0].topics.some((topic) => topic.needsReview));
  assert.deepEqual(empty.activity, { sessionCount: 0, questionCount: 0, practiceMinutes: 0, lastPracticedAt: null });
  assert.deepEqual(empty.exams, []);
  active.activity.sessionCount = 99;
  demoChildren[0].firstName = "changed";
  assert.notEqual((await parentProgressDemo.listChildren())[0].firstName, "changed");
  assert.notEqual((await parentProgressDemo.getProgress(active.childId)).activity.sessionCount, 99);
  await assert.rejects(() => parentProgressDemo.getProgress("child-1"), /Unknown demo child/);
});
