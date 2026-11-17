import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
let temporaryDirectory;
after(async () => {
  if (!temporaryDirectory) return;
  assert.equal(dirname(temporaryDirectory), join(root, "node_modules/.tmp"));
  await rm(temporaryDirectory, { recursive: true, force: true });
});

// Render production components and actual Tabler SVGs; only the service-worker
// registration is replaced because SSR has no browser or service worker.
async function loadViews() {
  const temporaryRoot = join(root, "node_modules/.tmp");
  await mkdir(temporaryRoot, { recursive: true });
  temporaryDirectory = await mkdtemp(join(temporaryRoot, "icons-"));
  const entry = join(temporaryDirectory, "entry.mjs");
  const source = (path) => JSON.stringify(join(root, "src", path).replaceAll("\\", "/"));
  await writeFile(
    entry,
    `
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { DirectionProvider, MantineProvider } from "@mantine/core";
    export { createElement } from "react";
    export { IconSchool, IconHandStop } from "@tabler/icons-react";
    export { Sidebar } from ${source("components/navigation/Sidebar.tsx")};
    export { StatCard } from ${source("components/dashboard/StatCard.tsx")};
    export { PageHeader } from ${source("components/ui/PageHeader.tsx")};
    export { AssignmentCard } from ${source("components/assignments/AssignmentCard.tsx")};
    export { CreateAssignmentModal } from ${source("components/assignments/CreateAssignmentModal.tsx")};
    export { AppLayout } from ${source("layouts/AppLayout.tsx")};
    export { TeacherDashboardPage } from ${source("pages/teacher/TeacherDashboardPage.tsx")};
    export { StudentDashboardPage } from ${source("pages/student/StudentDashboardPage.tsx")};
    export { AdminDashboardPage } from ${source("pages/admin/AdminDashboardPage.tsx")};
    export { AssignmentsPage } from ${source("pages/parent/AssignmentsPage.tsx")};
    export { ExamsPage } from ${source("pages/parent/ExamsPage.tsx")};
    export { MessagesPage } from ${source("pages/parent/MessagesPage.tsx")};
    export { appStrings, navigationStrings } from ${source("shared/strings/app.ts")};
    export { commonStrings } from ${source("shared/strings/common.ts")};
    export { parentStrings } from ${source("pages/parent/strings.ts")};
    export { teacherStrings } from ${source("pages/teacher/strings.ts")};
    export { studentStrings } from ${source("pages/student/strings.ts")};
    export { adminStrings } from ${source("pages/admin/strings.ts")};
    export { assignmentStrings } from ${source("components/assignments/strings.ts")};
    export function render(Component, props = {}) {
      return renderToStaticMarkup(createElement(DirectionProvider, { initialDirection: "rtl" },
        createElement(MantineProvider, { env: "test", theme: {
          components: { Modal: { defaultProps: { withinPortal: false } } }
        } }, createElement(Component, props))));
    }
  `,
  );
  const result = await build({
    root,
    configFile: false,
    envFile: false,
    logLevel: "silent",
    plugins: [
      react(),
      {
        name: "icons-test-service-worker",
        resolveId(id) {
          if (id === "virtual:pwa-register/react") return "\0icons-test-service-worker";
        },
        load(id) {
          if (id === "\0icons-test-service-worker") {
            return "export function useRegisterSW() { return { needRefresh: [false, () => {}], updateServiceWorker: async () => {} }; }";
          }
        },
      },
    ],
    build: { ssr: entry, write: false, minify: false },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  const modulePath = join(temporaryDirectory, "views.mjs");
  await writeFile(modulePath, output.find((item) => item.type === "chunk" && item.isEntry).code);
  return import(pathToFileURL(modulePath).href);
}

const views = loadViews();
const noop = () => {};
const assignment = {
  id: "assignment-1",
  studentId: "student-1",
  subject: "מתמטיקה",
  teacher: "המורה יעל",
  title: "תרגול שברים",
  description: "חיבור שברים",
  dueLabel: "מחר",
  status: "לביצוע",
  tone: "blue",
};

function assertIcons(html, names) {
  const icons = html.match(/<svg\b[^>]*class="[^"]*\btabler-icon\b[^"]*"[^>]*>/g) ?? [];
  assert.ok(icons.length > 0, "Expected real Tabler SVG icons");
  for (const name of names) {
    assert.ok(
      icons.some((svg) => svg.includes(`tabler-icon-${name}"`) || svg.includes(`tabler-icon-${name} `)),
      name,
    );
  }
  for (const svg of icons)
    assert.match(svg, /aria-hidden="true"/, "Decorative icons must not duplicate accessible names");
  assert.doesNotMatch(html, /[⌂✓▣□✉♧♙◈⚙●◷◉◴☀◐↑←◫👋＋]/u, "Former font/emoji icons must not remain");
}

function namedButton(html, label) {
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const button = buttons.find((element) => element.includes(`aria-label="${label}"`));
  assert.ok(button, `Expected an explicitly named button: ${label}`);
  return button;
}

test("all role sidebars render vector navigation icons and retain Hebrew labels", async () => {
  const { render, Sidebar, appStrings, navigationStrings: nav } = await views;
  const roles = {
    parent: [
      ["home", "checklist", "writing", "calendar-event", "mail"],
      [nav.overview, nav.assignments, nav.exams, nav.calendar, nav.messages],
    ],
    student: [
      ["home", "checklist", "writing", "calendar-event"],
      [nav.overview, nav.assignments, nav.exams, nav.calendar],
    ],
    teacher: [
      ["home", "school", "checklist", "writing", "mail"],
      [nav.overview, nav.classes, nav.assignments, nav.exams, nav.messages],
    ],
    admin: [
      ["home", "user", "users", "speakerphone", "settings"],
      [nav.overview, nav.students, nav.staff, nav.announcements, appStrings.settings],
    ],
  };
  for (const [role, [icons, labels]] of Object.entries(roles)) {
    const html = render(Sidebar, { role, page: nav.overview, onPageChange: noop });
    assertIcons(html, [...icons, "settings"]);
    for (const label of [...labels, appStrings.areas[role]]) assert.ok(html.includes(label), label);
    assert.match(html, /<img[^>]*alt="סקוּלי"/, "The custom brand asset remains available");
  }
});

test("role dashboards render SVG greetings, statistics and actions with readable text", async () => {
  const v = await views;
  const cases = [
    [
      v.TeacherDashboardPage,
      { classes: [], onCreate: noop },
      ["hand-stop", "plus", "school", "checklist", "calendar-event", "mail", "speakerphone"],
      [v.teacherStrings.title, v.teacherStrings.newAssignment, v.teacherStrings.newExam],
    ],
    [
      v.StudentDashboardPage,
      { assignments: [assignment], exams: [], onComplete: noop },
      ["hand-stop"],
      [v.studentStrings.title, assignment.title],
    ],
    [
      v.AdminDashboardPage,
      {},
      ["users", "chalkboard", "checklist", "mail"],
      [v.adminStrings.title, v.adminStrings.stats.students.label, "486"],
    ],
  ];
  for (const [Component, props, icons, labels] of cases) {
    const html = v.render(Component, props);
    assertIcons(html, icons);
    for (const label of labels) assert.ok(html.includes(label), label);
  }
});

test("parent exam metadata, material links and summary download use vector icons", async () => {
  const v = await views;
  const exams = v.render(v.ExamsPage);
  assertIcons(exams, ["calendar-event", "clock", "map-pin", "target", "arrow-left"]);
  for (const label of [
    v.parentStrings.exams.featuredDate,
    v.parentStrings.exams.featuredTime,
    v.parentStrings.exams.featuredLocation,
    v.parentStrings.exams.studyMaterials,
  ]) {
    assert.ok(exams.includes(label), label);
  }
  const assignments = v.render(v.AssignmentsPage, {
    assignments: [assignment],
    students: [],
    filter: v.commonStrings.all,
    onFilterChange: noop,
    onComplete: noop,
  });
  assertIcons(assignments, ["download", "book-2", "clock", "user"]);
  assert.ok(assignments.includes(v.parentStrings.assignments.download));
  assert.ok(assignments.includes(assignment.title));
});

test("message composition keeps its text action and gives the icon-only send button a name", async () => {
  const v = await views;
  const html = v.render(v.MessagesPage);
  assertIcons(html, ["plus", "send"]);
  assert.ok(html.includes(v.parentStrings.messages.newMessage));
  assert.ok(html.includes(v.parentStrings.messages.compose));
  assertIcons(namedButton(html, v.parentStrings.messages.send), ["send"]);
});

test("assignment action branches retain completion and details text beside SVG metadata", async () => {
  const v = await views;
  for (const status of [v.commonStrings.toDo, v.commonStrings.completed]) {
    const html = v.render(v.AssignmentCard, {
      assignment: { ...assignment, status },
      studentName: "נועה",
      onComplete: noop,
    });
    assertIcons(
      html,
      status === v.commonStrings.toDo ? ["book-2", "clock", "user"] : ["book-2", "clock", "user", "arrow-left"],
    );
    for (const label of [assignment.teacher, assignment.dueLabel, assignment.title])
      assert.ok(html.includes(label), label);
    assert.ok(html.includes(status === v.commonStrings.toDo ? v.commonStrings.markComplete : v.commonStrings.details));
  }
});

test("assignment creation uses SVG file and publish actions without prefix glyphs", async () => {
  const v = await views;
  const html = v.render(v.CreateAssignmentModal, { onClose: noop, onPublish: noop });
  assertIcons(html, ["paperclip", "plus"]);
  assert.ok(html.includes(v.assignmentStrings.addFile));
  assert.ok(html.includes(v.assignmentStrings.publish));
});

test("shared stat cards and page headers accept SVG icons without losing content", async () => {
  const v = await views;
  const stat = v.render(v.StatCard, {
    icon: v.createElement(v.IconSchool, { "aria-hidden": "true" }),
    tone: "blue",
    value: "17",
    label: "כיתות",
    note: "השבוע",
  });
  assertIcons(stat, ["school"]);
  for (const label of ["17", "כיתות", "השבוע"]) assert.ok(stat.includes(label));
  const header = v.render(v.PageHeader, {
    eyebrow: "לימודים",
    title: "שלום",
    titleIcon: v.createElement(v.IconHandStop, { "aria-hidden": "true" }),
    description: "תמונת מצב",
  });
  assertIcons(header, ["hand-stop"]);
  assert.match(header, /<h1\b[^>]*>שלום<\/h1>/);
  assert.ok(header.includes("תמונת מצב"));
});

test("layout light and dark controls keep accessible names and distinct SVG icons", async () => {
  const v = await views;
  for (const darkMode of [false, true]) {
    const html = v.render(v.AppLayout, {
      children: "תוכן העמוד",
      role: "parent",
      page: v.navigationStrings.overview,
      darkMode,
      onRoleChange: noop,
      onPageChange: noop,
      onThemeToggle: noop,
    });
    assertIcons(namedButton(html, v.appStrings.openNavigation), ["menu-2"]);
    assert.match(namedButton(html, v.appStrings.openNavigation), /aria-expanded="false"/);
    assertIcons(namedButton(html, darkMode ? v.appStrings.lightMode : v.appStrings.darkMode), [
      darkMode ? "sun" : "moon-stars",
    ]);
    assertIcons(namedButton(html, v.appStrings.notifications), ["bell"]);
    assert.ok(html.includes("תוכן העמוד"));
  }
});
