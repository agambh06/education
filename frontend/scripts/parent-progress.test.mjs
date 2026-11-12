import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import react from "@vitejs/plugin-react";
import ts from "typescript";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
let temporaryDirectory;

after(async () => {
  if (temporaryDirectory) {
    assert.equal(dirname(temporaryDirectory), join(root, "node_modules/.tmp"));
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

// Render the actual dashboard and Mantine components. Vite transforms the same
// TypeScript/JSX used by the app; no browser, API server, or database is needed.
async function loadDashboard() {
  const temporaryRoot = join(root, "node_modules/.tmp");
  await mkdir(temporaryRoot, { recursive: true });
  temporaryDirectory = await mkdtemp(join(temporaryRoot, "parent-progress-"));
  const entry = join(temporaryDirectory, "entry.mjs");
  await writeFile(
    entry,
    `
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { MantineProvider } from "@mantine/core";
    import { ParentProgressDashboard } from ${JSON.stringify(join(root, "src/pages/parent/ParentDashboardPage.tsx").replaceAll("\\", "/"))};
    export { parentStrings } from ${JSON.stringify(join(root, "src/pages/parent/strings.ts").replaceAll("\\", "/"))};
    export function render(state) {
      return renderToStaticMarkup(createElement(MantineProvider, { env: "test" },
        createElement(ParentProgressDashboard, { state })));
    }
  `,
  );
  const result = await build({
    root,
    configFile: false,
    envFile: false,
    logLevel: "silent",
    plugins: [react()],
    build: { ssr: entry, write: false, minify: false },
  });
  const chunks = (Array.isArray(result) ? result[0] : result).output;
  const code = chunks.find((item) => item.type === "chunk" && item.isEntry).code;
  const modulePath = join(temporaryDirectory, "dashboard.mjs");
  await writeFile(modulePath, code);
  return import(pathToFileURL(modulePath).href);
}

const children = [
  { id: "child-a", firstName: "First", lastName: "Child" },
  { id: "child-b", firstName: "Second", lastName: "Child" },
];

function progress(childId = "child-a") {
  return {
    childId,
    activity: {
      sessionCount: 7,
      questionCount: 34,
      practiceMinutes: 56,
      lastPracticedAt: "2026-11-10T12:30:00Z",
    },
    exams: [
      {
        id: "exam-a",
        subject: "Mathematics",
        title: "Fractions exam",
        scheduledAt: "2099-11-20T08:00:00Z",
        topics: [
          { id: "topic-a", title: "Adding fractions", practiceCount: 3, needsReview: false },
          { id: "topic-b", title: "Dividing fractions", practiceCount: 0, needsReview: true },
        ],
      },
    ],
  };
}

function dashboardState(overrides = {}) {
  return {
    mode: "live",
    status: "ready",
    children,
    selectedChildId: "child-a",
    progress: progress(),
    selectChild() {},
    refresh() {},
    startDemo() {},
    exitDemo() {},
    ...overrides,
  };
}

const dashboard = loadDashboard();

test("linked-child dashboard renders practice totals, upcoming exams, and topic gaps", async () => {
  const { render, parentStrings } = await dashboard;
  const html = render(dashboardState());
  for (const value of [
    "First Child",
    "Mathematics",
    "Fractions exam",
    "Adding fractions",
    "Dividing fractions",
    "34",
    "56",
  ]) {
    assert.ok(html.includes(value), `Expected dashboard to contain ${value}`);
  }
  assert.ok(html.includes("50%"));
  assert.ok(html.includes(parentStrings.dashboard.coverageLimitation));
  assert.match(html, /dir="rtl"/);
});

test("multiple linked children have an accessible child selector", async () => {
  const { render } = await dashboard;
  const html = render(dashboardState());
  assert.match(html, /role="combobox"|<select|role="radiogroup"/);
  assert.ok(html.includes("First Child"));
  assert.ok(html.includes("Second Child"));
});

test("empty learning progress shows empty states instead of fabricated activity", async () => {
  const { render, parentStrings } = await dashboard;
  const html = render(
    dashboardState({
      progress: {
        childId: "child-a",
        activity: { sessionCount: 0, questionCount: 0, practiceMinutes: 0, lastPracticedAt: null },
        exams: [],
      },
    }),
  );
  assert.ok(html.includes("First Child"));
  assert.ok(!html.includes("Fractions exam"));
  assert.ok(!html.includes("Dividing fractions"));
  assert.ok(html.includes(parentStrings.dashboard.noActivityTitle));
  assert.ok(html.includes(parentStrings.dashboard.noExams));
  assert.ok(html.includes(parentStrings.dashboard.noLastPractice));
});

test("unlinked, denied, and unavailable views do not expose previous child progress", async () => {
  const { render, parentStrings } = await dashboard;
  for (const status of ["unlinked", "denied", "unavailable", "error"]) {
    // Defense in depth: even a caller retaining old data must not reveal it.
    const html = render(dashboardState({ status }));
    assert.ok(!html.includes("First Child"), status);
    assert.ok(!html.includes("Fractions exam"), status);
    assert.ok(!html.includes("Dividing fractions"), status);
    assert.ok(html.includes(parentStrings.dashboard[`${status}Title`]), status);
  }
});

test("an exam without configured topics has an unknown estimate rather than a zero score", async () => {
  const { render, parentStrings } = await dashboard;
  const summary = progress();
  summary.exams[0].topics = [];
  const html = render(dashboardState({ progress: summary }));
  assert.ok(html.includes(parentStrings.dashboard.unknownCoverage));
  assert.ok(html.includes(parentStrings.dashboard.noTopics));
  assert.ok(!html.includes('role="progressbar"'));
});

test("loading and mismatched-child transitions never display another child's summary", async () => {
  const { render } = await dashboard;
  for (const state of [
    dashboardState({ status: "loading" }),
    dashboardState({ selectedChildId: "unlinked-child" }),
    dashboardState({ progress: progress("child-b") }),
  ]) {
    const html = render(state);
    assert.ok(!html.includes("Fractions exam"));
    assert.ok(!html.includes("Dividing fractions"));
  }
  assert.match(render(dashboardState({ status: "loading" })), /aria-busy="true"/);
});

test("past exams and raw private fields are excluded from the parent summary", async () => {
  const { render } = await dashboard;
  const summary = progress();
  summary.rawAnswers = "private-answer-marker";
  summary.personalNotes = "private-note-marker";
  summary.messages = "private-message-marker";
  summary.uploads = "private-upload-marker";
  summary.exams.push({
    id: "past-exam",
    subject: "Past subject",
    title: "Past exam marker",
    scheduledAt: "2000-01-01T00:00:00Z",
    topics: [{ id: "past-topic", title: "Past topic marker", practiceCount: 0, needsReview: true }],
  });
  const html = render(dashboardState({ progress: summary }));
  for (const marker of [
    "private-answer-marker",
    "private-note-marker",
    "private-message-marker",
    "private-upload-marker",
    "Past exam marker",
    "Past topic marker",
  ]) {
    assert.ok(!html.includes(marker), marker);
  }
});

test("demo summaries display an explicit fictional-data notice and exit control", async () => {
  const { render, parentStrings } = await dashboard;
  const html = render(dashboardState({ mode: "demo" }));
  assert.ok(html.includes(parentStrings.dashboard.demoTitle));
  assert.ok(html.includes(parentStrings.dashboard.demoDescription));
  assert.ok(html.includes(parentStrings.dashboard.exitDemo));
  assert.ok(!html.includes(parentStrings.dashboard.demoAction));
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Like the existing PWA lifecycle tests, execute the real hook with controlled
// React boundaries so delayed/revoked requests can be tested deterministically.
async function setupHook(modules) {
  const source = await readFile(new URL("../src/hooks/useParentProgress.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const slots = [];
  let index = 0;
  let dirty = false;
  let value;
  let effects = [];
  const events = new Map();
  const sameDependencies = (left, right) =>
    left && right && left.length === right.length && left.every((item, i) => Object.is(item, right[i]));
  const reactHooks = {
    useState(initial) {
      const position = index++;
      if (!(position in slots)) slots[position] = typeof initial === "function" ? initial() : initial;
      return [
        slots[position],
        (next) => {
          const nextValue = typeof next === "function" ? next(slots[position]) : next;
          if (!Object.is(nextValue, slots[position])) {
            slots[position] = nextValue;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const position = index++;
      if (!(position in slots)) slots[position] = { current: initial };
      return slots[position];
    },
    useEffect(effect, dependencies) {
      const position = index++;
      const previous = slots[position];
      if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
        slots[position] = { dependencies, cleanup: previous?.cleanup };
        effects.push(() => {
          slots[position].cleanup?.();
          slots[position].cleanup = effect();
        });
      }
    },
    useCallback(callback, dependencies) {
      const position = index++;
      if (!slots[position] || !sameDependencies(slots[position].dependencies, dependencies)) {
        slots[position] = { dependencies, callback };
      }
      return slots[position].callback;
    },
  };
  const exports = {};
  const browserDocument = {
    visibilityState: "visible",
    addEventListener(name, callback) {
      events.set(name, callback);
    },
    removeEventListener(name, callback) {
      assert.equal(events.get(name), callback);
      events.delete(name);
    },
  };
  runInNewContext(outputText, {
    exports,
    AbortController,
    DOMException,
    TypeError,
    window: {
      addEventListener(name, callback) {
        events.set(name, callback);
      },
      removeEventListener(name, callback) {
        assert.equal(events.get(name), callback);
        events.delete(name);
      },
    },
    document: browserDocument,
    require(name) {
      if (name === "react") return reactHooks;
      assert.ok(name in modules, `Unexpected hook dependency ${name}`);
      return modules[name];
    },
  });
  function render() {
    index = 0;
    dirty = false;
    effects = [];
    // biome-ignore lint/correctness/useHookAtTopLevel: This deterministic lifecycle harness supplies React's hook boundaries.
    value = exports.useParentProgress();
    for (const effect of effects) effect();
  }
  render();
  return {
    events,
    document: browserDocument,
    get value() {
      return value;
    },
    async flush() {
      for (let round = 0; round < 20; round += 1) {
        await Promise.resolve();
        if (dirty) render();
      }
      return value;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

class ApiError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

class ParentProgressDataError extends Error {}

function mountHook(live, demo = { listChildren: async () => children, getProgress: async (id) => progress(id) }) {
  return setupHook({
    "../data/parentProgressDemo": { parentProgressDemo: demo },
    "../services/apiClient": { ApiError },
    "../services/parentProgressService": { ParentProgressDataError, parentProgressService: live },
  });
}

test("an unlinked account makes no progress request and does not silently enter demo", async (t) => {
  let progressRequests = 0;
  const hook = await mountHook({
    listChildren: async () => [],
    getProgress: async () => {
      progressRequests += 1;
    },
  });
  t.after(() => hook.unmount());
  await hook.flush();
  assert.equal(hook.value.status, "unlinked");
  assert.equal(hook.value.mode, "live");
  assert.equal(hook.value.progress, null);
  assert.equal(progressRequests, 0);
});

test("selecting another linked child clears old data and rechecks the relationship", async (t) => {
  const secondSummary = deferred();
  let linkChecks = 0;
  const requests = [];
  const hook = await mountHook({
    listChildren: async () => {
      linkChecks += 1;
      return children;
    },
    getProgress: async (id) => {
      requests.push(id);
      return id === "child-a" ? progress(id) : secondSummary.promise;
    },
  });
  t.after(() => hook.unmount());
  await hook.flush();
  assert.equal(hook.value.progress.childId, "child-a");
  hook.value.selectChild("child-b");
  await hook.flush();
  assert.equal(hook.value.status, "loading");
  assert.equal(hook.value.progress, null);
  assert.equal(linkChecks, 2);
  secondSummary.resolve(progress("child-b"));
  await hook.flush();
  assert.equal(hook.value.status, "ready");
  assert.equal(hook.value.selectedChildId, "child-b");
  assert.equal(hook.value.progress.childId, "child-b");
  assert.deepEqual(requests, ["child-a", "child-b"]);
});

test("a delayed response for the previous child cannot replace the current child's summary", async (t) => {
  const firstSummary = deferred();
  const signals = [];
  const hook = await mountHook({
    listChildren: async () => children,
    getProgress: async (id, signal) => {
      signals.push(signal);
      return id === "child-a" ? firstSummary.promise : progress(id);
    },
  });
  t.after(() => hook.unmount());
  await hook.flush();
  hook.value.selectChild("child-b");
  await hook.flush();
  assert.equal(signals[0].aborted, true);
  assert.equal(hook.value.progress.childId, "child-b");
  firstSummary.resolve(progress("child-a"));
  await hook.flush();
  assert.equal(hook.value.selectedChildId, "child-b");
  assert.equal(hook.value.progress.childId, "child-b");
});

test("a revoked link on refresh discards children and previous progress", async (t) => {
  let linked = true;
  const hook = await mountHook({
    listChildren: async () => (linked ? children : []),
    getProgress: async (id) => progress(id),
  });
  t.after(() => hook.unmount());
  await hook.flush();
  assert.equal(hook.value.status, "ready");
  linked = false;
  hook.value.refresh();
  await hook.flush();
  assert.equal(hook.value.status, "unlinked");
  assert.equal(hook.value.children.length, 0);
  assert.equal(hook.value.selectedChildId, null);
  assert.equal(hook.value.progress, null);
});

test("revoking the selected child's link does not silently switch to another linked child", async (t) => {
  let linkedChildren = children;
  const requests = [];
  const hook = await mountHook({
    listChildren: async () => linkedChildren,
    getProgress: async (id) => {
      requests.push(id);
      return progress(id);
    },
  });
  t.after(() => hook.unmount());
  await hook.flush();
  hook.value.selectChild("child-b");
  await hook.flush();
  assert.equal(hook.value.selectedChildId, "child-b");
  linkedChildren = [children[0]];
  hook.value.refresh();
  await hook.flush();
  assert.equal(hook.value.status, "denied");
  assert.equal(hook.value.children.length, 0);
  assert.equal(hook.value.selectedChildId, null);
  assert.equal(hook.value.progress, null);
  assert.deepEqual(requests, ["child-a", "child-b"]);
});

test("denied progress access clears all prior child data", async (t) => {
  let allowed = true;
  const hook = await mountHook({
    listChildren: async () => children,
    getProgress: async (id) => {
      if (!allowed) throw new ApiError(403);
      return progress(id);
    },
  });
  t.after(() => hook.unmount());
  await hook.flush();
  allowed = false;
  hook.value.refresh();
  await hook.flush();
  assert.equal(hook.value.status, "denied");
  assert.equal(hook.value.children.length, 0);
  assert.equal(hook.value.selectedChildId, null);
  assert.equal(hook.value.progress, null);
});

test("an arbitrary unlinked child identifier is denied without requesting its progress", async (t) => {
  const requests = [];
  const hook = await mountHook({
    listChildren: async () => children,
    getProgress: async (id) => {
      requests.push(id);
      return progress(id);
    },
  });
  t.after(() => hook.unmount());
  await hook.flush();
  hook.value.selectChild("unlinked-child");
  await hook.flush();
  assert.equal(hook.value.status, "denied");
  assert.equal(hook.value.progress, null);
  assert.deepEqual(requests, ["child-a"]);
});

test("demo requires an explicit action and exiting revalidates live access", async (t) => {
  let liveChecks = 0;
  const hook = await mountHook({
    listChildren: async () => {
      liveChecks += 1;
      throw new ApiError(404);
    },
    getProgress: async (id) => progress(id),
  });
  t.after(() => hook.unmount());
  await hook.flush();
  assert.equal(hook.value.status, "unavailable");
  assert.equal(hook.value.mode, "live");
  assert.equal(hook.value.progress, null);
  hook.value.startDemo();
  await hook.flush();
  assert.equal(hook.value.status, "ready");
  assert.equal(hook.value.mode, "demo");
  hook.value.exitDemo();
  await hook.flush();
  assert.equal(hook.value.status, "unavailable");
  assert.equal(hook.value.mode, "live");
  assert.equal(hook.value.progress, null);
  assert.equal(liveChecks, 2);
});

test("a late live response cannot replace an explicitly selected demo summary", async (t) => {
  const liveSummary = deferred();
  const demoSummary = progress();
  demoSummary.activity.questionCount = 999;
  const hook = await mountHook(
    { listChildren: async () => children, getProgress: async () => liveSummary.promise },
    { listChildren: async () => children, getProgress: async () => demoSummary },
  );
  t.after(() => hook.unmount());
  await hook.flush();
  hook.value.startDemo();
  await hook.flush();
  assert.equal(hook.value.mode, "demo");
  assert.equal(hook.value.progress.activity.questionCount, 999);
  liveSummary.resolve(progress());
  await hook.flush();
  assert.equal(hook.value.mode, "demo");
  assert.equal(hook.value.status, "ready");
  assert.equal(hook.value.progress.activity.questionCount, 999);
});

test("focus rechecks authorization and unmount aborts requests and removes listeners", async () => {
  let linkChecks = 0;
  let currentSignal;
  const hook = await mountHook({
    listChildren: async (signal) => {
      linkChecks += 1;
      currentSignal = signal;
      return children;
    },
    getProgress: async (id) => progress(id),
  });
  await hook.flush();
  hook.events.get("focus")();
  await hook.flush();
  assert.equal(linkChecks, 2);
  hook.document.visibilityState = "hidden";
  hook.events.get("visibilitychange")();
  await hook.flush();
  assert.equal(linkChecks, 2);
  hook.document.visibilityState = "visible";
  hook.events.get("visibilitychange")();
  await hook.flush();
  assert.equal(linkChecks, 3);
  assert.equal(hook.events.size, 3);
  hook.unmount();
  assert.equal(currentSignal.aborted, true);
  assert.equal(hook.events.size, 0);
});
