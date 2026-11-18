import { DirectionProvider, MantineProvider } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { assignmentStrings } from "./components/assignments/strings";
import { students } from "./data/mockData";
import { adminStrings } from "./pages/admin/strings";
import { learningReminderStrings } from "./pages/parent/learningReminderStrings";
import { parentStrings } from "./pages/parent/strings";
import { studentStrings } from "./pages/student/strings";
import { teacherStrings } from "./pages/teacher/strings";
import type { LearningReminderStatus } from "./services/learningRemindersService";
import { appStrings, navigationStrings } from "./shared/strings/app";
import { commonStrings } from "./shared/strings/common";
import type { Assignment } from "./types/domain";
import type { ParentLearningProgress, ParentLinkedChild } from "./types/parentProgress";

const users = {
  PARENT: { id: "parent-1", email: "parent@example.com", firstName: "Test", lastName: "Parent", role: "PARENT" },
  STUDENT: { id: "student-1", email: "student@example.com", firstName: "Test", lastName: "Student", role: "STUDENT" },
  TEACHER: { id: "teacher-1", email: "teacher@example.com", firstName: "Test", lastName: "Teacher", role: "TEACHER" },
  ADMIN: { id: "admin-1", email: "admin@example.com", firstName: "Test", lastName: "Admin", role: "ADMIN" },
} as const;
let activeUser: (typeof users)[keyof typeof users] = users.PARENT;
const initialAssignments: Assignment[] = [
  {
    id: "a1",
    studentId: "noa",
    studentName: "נועה כהן",
    subject: "מתמטיקה",
    teacher: "המורה לוי",
    title: "דף תרגול שברים",
    dueAt: "2026-11-20T09:00:00.000Z",
    dueLabel: "20 בנובמבר 2026 בשעה 11:00",
    status: commonStrings.toDo,
    description: "יש להשלים את שאלות 1–12 בדף העבודה המצורף.",
    tone: "blue",
  },
  {
    id: "a2",
    studentId: "daniel",
    studentName: "דניאל כהן",
    subject: "אנגלית",
    teacher: "המורה גרין",
    title: "קריאת ״הגן הסודי״",
    dueAt: "2026-11-21T09:00:00.000Z",
    dueLabel: "21 בנובמבר 2026 בשעה 11:00",
    status: commonStrings.toDo,
    description: "לקרוא פרקים 3–4 ולרשום שלוש מילים חדשות.",
    tone: "teal",
  },
  {
    id: "a3",
    studentId: "noa",
    studentName: "נועה כהן",
    subject: "מדעים",
    teacher: "המורה רובין",
    title: "מחקר על מערכת השמש",
    dueAt: "2026-11-22T09:00:00.000Z",
    dueLabel: "22 בנובמבר 2026 בשעה 11:00",
    status: commonStrings.completed,
    description: "להכין דף מידע קצר על כוכב הלכת שנבחר.",
    tone: "purple",
  },
  {
    id: "a4",
    studentId: "daniel",
    studentName: "דניאל כהן",
    subject: "עברית",
    teacher: "המורה בר",
    title: "תרגול איות",
    dueAt: "2026-11-10T09:00:00.000Z",
    dueLabel: "10 בנובמבר 2026 בשעה 11:00",
    status: commonStrings.overdue,
    description: "לתרגל את רשימת המילים השבועית.",
    tone: "orange",
  },
];
let assignmentResponses = initialAssignments.map((assignment) => ({
  ...assignment,
  status:
    assignment.status === commonStrings.toDo
      ? ("TODO" as const)
      : assignment.status === commonStrings.completed
        ? ("COMPLETED" as const)
        : ("OVERDUE" as const),
}));

function mockParentProgress(
  children: ParentLinkedChild[],
  progressByChild: Record<string, ParentLearningProgress> = {},
) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/auth/me")) return Response.json({ user: activeUser });
    if (url.endsWith("/assignments")) return Response.json(assignmentResponses);
    const completing = url.match(/\/assignments\/([^/]+)\/complete$/);
    if (completing) {
      assignmentResponses = assignmentResponses.map((assignment) =>
        assignment.id === completing[1] ? { ...assignment, status: "COMPLETED" as const } : assignment,
      );
      return Response.json(assignmentResponses.find((assignment) => assignment.id === completing[1]));
    }
    if (url.endsWith("/parent/children")) return Response.json({ children });
    const child = children.find(({ id }) => url.endsWith(`/parent/children/${id}/learning-progress`));
    if (child && progressByChild[child.id]) return Response.json(progressByChild[child.id]);
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function learningProgress(child: ParentLinkedChild): ParentLearningProgress {
  return {
    childId: child.id,
    activity: { sessionCount: 2, questionCount: 12, practiceMinutes: 15, lastPracticedAt: null },
    exams: [
      {
        id: `exam-${child.id}`,
        subject: "Mathematics",
        title: `${child.firstName} practice exam`,
        scheduledAt: "2099-01-01T10:00:00Z",
        topics: [{ id: "topic-1", title: "Fractions", practiceCount: 2, needsReview: false }],
      },
    ],
  };
}

async function renderApp() {
  const user = userEvent.setup();
  render(
    <DirectionProvider initialDirection="rtl">
      <MantineProvider env="test" defaultColorScheme="light">
        <Notifications />
        <App />
      </MantineProvider>
    </DirectionProvider>,
  );
  await screen.findByRole("button", { name: "יציאה" });
  return user;
}

beforeEach(() => {
  assignmentResponses = initialAssignments.map((assignment) => ({
    ...assignment,
    status:
      assignment.status === commonStrings.toDo
        ? "TODO"
        : assignment.status === commonStrings.completed
          ? "COMPLETED"
          : "OVERDUE",
  }));
  mockParentProgress([]);
  activeUser = users.PARENT;
});
afterEach(() => notifications.clean());

describe("assignment flows", () => {
  it("filters assignments by each status and restores the full list", async () => {
    const user = await renderApp();
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));
    for (const assignment of initialAssignments) expect(await screen.findByText(assignment.title)).toBeVisible();

    for (const status of [commonStrings.toDo, commonStrings.completed, commonStrings.overdue]) {
      await user.click(screen.getByRole("tab", { name: status }));
      expect(screen.getByRole("tab", { name: status })).toHaveAttribute("aria-selected", "true");
      for (const assignment of initialAssignments) {
        if (assignment.status === status) expect(screen.getByText(assignment.title)).toBeVisible();
        else expect(screen.queryByText(assignment.title)).not.toBeInTheDocument();
      }
    }

    await user.click(screen.getByRole("tab", { name: commonStrings.all }));
    for (const assignment of initialAssignments) expect(await screen.findByText(assignment.title)).toBeVisible();
  });

  it("keeps verified progress child selection separate from assignment status filters across navigation", async () => {
    const noa = students[0];
    const daniel = students[1];
    const noaProgress = learningProgress(noa);
    const danielProgress = learningProgress(daniel);
    mockParentProgress([noa, daniel], { [noa.id]: noaProgress, [daniel.id]: danielProgress });
    const user = await renderApp();
    expect(await screen.findByRole("heading", { name: noaProgress.exams[0].title })).toBeVisible();
    await user.click(screen.getByRole("combobox", { name: parentStrings.dashboard.childLabel }));
    await user.click(screen.getByRole("option", { name: `${daniel.firstName} ${daniel.lastName}` }));
    expect(await screen.findByRole("heading", { name: danielProgress.exams[0].title })).toBeVisible();
    expect(screen.queryByRole("heading", { name: noaProgress.exams[0].title })).not.toBeInTheDocument();
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));

    for (const assignment of initialAssignments) expect(await screen.findByText(assignment.title)).toBeVisible();
    await user.click(screen.getByRole("tab", { name: commonStrings.toDo }));
    expect(screen.getByText(initialAssignments[0].title)).toBeVisible();
    expect(screen.getByText(initialAssignments[1].title)).toBeVisible();
    expect(screen.queryByText(initialAssignments[2].title)).not.toBeInTheDocument();
    expect(screen.queryByText(initialAssignments[3].title)).not.toBeInTheDocument();

    await user.click(screen.getByText(navigationStrings.overview, { exact: true }));
    expect(await screen.findByRole("heading", { name: noaProgress.exams[0].title })).toBeVisible();
    expect(screen.getByRole("combobox", { name: parentStrings.dashboard.childLabel })).toHaveValue(
      `${noa.firstName} ${noa.lastName}`,
    );
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));
    expect(screen.getByRole("tab", { name: commonStrings.toDo })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(initialAssignments[0].title)).toBeVisible();
    expect(screen.getByText(initialAssignments[1].title)).toBeVisible();
    expect(screen.queryByText(initialAssignments[2].title)).not.toBeInTheDocument();
    expect(screen.queryByText(initialAssignments[3].title)).not.toBeInTheDocument();
  });

  it("marks a task complete through the real hook and updates both status tabs", async () => {
    const user = await renderApp();
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));
    await user.click(screen.getByRole("tab", { name: commonStrings.toDo }));
    await user.click(screen.getAllByRole("button", { name: commonStrings.markComplete })[0]);

    expect(screen.queryByText(initialAssignments[0].title)).not.toBeInTheDocument();
    expect(screen.getByText(initialAssignments[1].title)).toBeVisible();
    expect(screen.getByText(assignmentStrings.completedNotification)).toBeVisible();
    expect(screen.getAllByRole("button", { name: commonStrings.markComplete })).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: commonStrings.completed }));
    expect(screen.getByText(initialAssignments[0].title)).toBeVisible();
    expect(screen.getByText(initialAssignments[2].title)).toBeVisible();
    expect(screen.queryByRole("button", { name: commonStrings.markComplete })).not.toBeInTheDocument();
  });

  it("updates the student's completion summary after completing an assignment", async () => {
    activeUser = users.STUDENT;
    const user = await renderApp();
    expect(await screen.findByText(studentStrings.completionSummary(1, 4))).toBeVisible();
    const tasks = screen.getByRole("heading", { name: studentStrings.taskHeading }).parentElement;
    expect(tasks).not.toBeNull();
    if (!tasks) throw new Error("Student task section was not rendered");
    await user.click(within(tasks).getAllByRole("button", { name: commonStrings.done })[0]);
    expect(await screen.findByText(studentStrings.completionSummary(2, 4))).toBeVisible();
    expect(within(tasks).getAllByRole("button", { name: commonStrings.done })).toHaveLength(1);
    expect(screen.getByText(initialAssignments[0].title)).toBeVisible();
  });
});

describe("role rendering and navigation", () => {
  it("opens gated parent reminder settings and returns to the verified-link progress flow", async () => {
    const progressFetch = mockParentProgress([]);
    const reminderStatus: LearningReminderStatus = {
      settingsAvailable: false,
      deliveryEnabled: false,
      blockedBy: ["AUTHENTICATION", "VERIFIED_LINKS", "PERMITTED_PROGRESS", "PRIVACY_REVIEW"],
      defaults: { upcomingExams: false, lowActivity: false, timeZone: "Asia/Jerusalem" },
      policy: { windowStartHour: 9, windowEndHour: 19, childCooldownDays: 7, parentWeeklyLimit: 2 },
    };
    const fetchMock = vi.fn<typeof fetch>(async (input, options) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/parent-reminders/status")) return Response.json(reminderStatus);
      return progressFetch(input, options);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = await renderApp();
    expect(await screen.findByText(parentStrings.dashboard.unlinkedTitle)).toBeVisible();

    await user.click(screen.getByText(appStrings.settings, { exact: true }));
    expect(screen.getByRole("heading", { name: learningReminderStrings.header.title })).toBeVisible();
    expect(await screen.findByText(learningReminderStrings.unavailableTitle)).toBeVisible();
    for (const name of [
      `${learningReminderStrings.upcomingExams} ${learningReminderStrings.upcomingExamsDescription}`,
      `${learningReminderStrings.lowActivity} ${learningReminderStrings.lowActivityDescription}`,
    ]) {
      const control = screen.getByRole("switch", { name });
      expect(control).toBeDisabled();
      expect(control).not.toBeChecked();
    }
    expect(screen.getByText(learningReminderStrings.disabledControls)).toBeVisible();
    expect(screen.getByText(learningReminderStrings.blockers.PRIVACY_REVIEW)).toBeVisible();

    await user.click(screen.getByText(navigationStrings.overview, { exact: true }));
    expect(screen.getByRole("heading", { name: parentStrings.dashboard.title })).toBeVisible();
    expect(await screen.findByText(parentStrings.dashboard.unlinkedTitle)).toBeVisible();
    expect(screen.queryByRole("heading", { name: learningReminderStrings.header.title })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText(parentStrings.dashboard.recordedData)).not.toBeInTheDocument();
    expect(progressFetch.mock.calls.filter(([input]) => String(input).endsWith("/parent/children"))).toHaveLength(2);
  });

  it("does not display mock children or a child selector without verified parent links", async () => {
    await renderApp();
    expect(await screen.findByText(parentStrings.dashboard.unlinkedTitle)).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    for (const student of students) {
      expect(screen.queryByDisplayValue(`${student.firstName} ${student.lastName}`)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(parentStrings.dashboard.recordedData)).not.toBeInTheDocument();
  });

  it.each([
    [navigationStrings.exams, parentStrings.exams.title],
    [navigationStrings.calendar, parentStrings.calendar.title],
    [navigationStrings.messages, parentStrings.messages.title],
  ])("opens the parent's %s page and returns to the overview", async (navigation, title) => {
    const user = await renderApp();
    expect(screen.getByRole("heading", { name: parentStrings.dashboard.title })).toBeVisible();
    await user.click(screen.getByText(navigation, { exact: true }));
    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.queryByRole("heading", { name: parentStrings.dashboard.title })).not.toBeInTheDocument();
    await user.click(screen.getByText(navigationStrings.overview, { exact: true }));
    expect(screen.getByRole("heading", { name: parentStrings.dashboard.title })).toBeVisible();
  });

  it("renders dashboards and navigation from the authenticated role", async () => {
    const roles = [
      {
        key: "STUDENT" as const,
        title: studentStrings.title,
        area: appStrings.areas.student,
        nav: navigationStrings.calendar,
        unavailable: navigationStrings.messages,
      },
      {
        key: "TEACHER" as const,
        title: teacherStrings.title,
        area: appStrings.areas.teacher,
        nav: navigationStrings.classes,
        unavailable: navigationStrings.calendar,
      },
      {
        key: "ADMIN" as const,
        title: adminStrings.title,
        area: appStrings.areas.admin,
        nav: navigationStrings.staff,
        unavailable: navigationStrings.assignments,
      },
      {
        key: "PARENT" as const,
        title: parentStrings.dashboard.title,
        area: appStrings.areas.parent,
        nav: navigationStrings.messages,
        unavailable: navigationStrings.staff,
      },
    ];
    for (const role of roles) {
      cleanup();
      activeUser = users[role.key];
      await renderApp();
      expect(screen.getByRole("heading", { name: role.title })).toBeVisible();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByText(role.area)).toBeVisible();
      expect(screen.getByText(role.nav, { exact: true })).toBeVisible();
      expect(screen.queryByText(role.unavailable, { exact: true })).not.toBeInTheDocument();
    }
  });
});
