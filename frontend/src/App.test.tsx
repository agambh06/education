import { DirectionProvider, MantineProvider } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { assignmentStrings } from "./components/assignments/strings";
import { assignments, students } from "./data/mockData";
import { adminStrings } from "./pages/admin/strings";
import { parentStrings } from "./pages/parent/strings";
import { studentStrings } from "./pages/student/strings";
import { teacherStrings } from "./pages/teacher/strings";
import { appStrings, navigationStrings } from "./shared/strings/app";
import { commonStrings } from "./shared/strings/common";

function renderApp() {
  const user = userEvent.setup();
  render(
    <DirectionProvider initialDirection="rtl">
      <MantineProvider env="test" defaultColorScheme="light">
        <Notifications />
        <App />
      </MantineProvider>
    </DirectionProvider>,
  );
  return user;
}

afterEach(() => notifications.clean());

describe("assignment flows", () => {
  it("filters assignments by each status and restores the full list", async () => {
    const user = renderApp();
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));
    for (const assignment of assignments) expect(screen.getByText(assignment.title)).toBeVisible();

    for (const status of [commonStrings.toDo, commonStrings.completed, commonStrings.overdue]) {
      await user.click(screen.getByRole("tab", { name: status }));
      expect(screen.getByRole("tab", { name: status })).toHaveAttribute("aria-selected", "true");
      for (const assignment of assignments) {
        if (assignment.status === status) expect(screen.getByText(assignment.title)).toBeVisible();
        else expect(screen.queryByText(assignment.title)).not.toBeInTheDocument();
      }
    }

    await user.click(screen.getByRole("tab", { name: commonStrings.all }));
    for (const assignment of assignments) expect(screen.getByText(assignment.title)).toBeVisible();
  });

  it("combines the selected child with status filters across parent navigation", async () => {
    const user = renderApp();
    const noa = students[0];
    const daniel = students[1];
    await user.click(screen.getByDisplayValue(commonStrings.allChildren));
    await user.click(screen.getByRole("option", { name: `${noa.firstName} ${noa.lastName}` }));
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));

    expect(screen.getByText(assignments[0].title)).toBeVisible();
    expect(screen.getByText(assignments[2].title)).toBeVisible();
    expect(screen.queryByText(assignments[1].title)).not.toBeInTheDocument();
    expect(screen.queryByText(assignments[3].title)).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: commonStrings.toDo }));
    expect(screen.getByText(assignments[0].title)).toBeVisible();
    expect(screen.queryByText(assignments[2].title)).not.toBeInTheDocument();

    await user.click(screen.getByText(navigationStrings.overview, { exact: true }));
    await user.click(screen.getByDisplayValue(`${noa.firstName} ${noa.lastName}`));
    await user.click(screen.getByRole("option", { name: `${daniel.firstName} ${daniel.lastName}` }));
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));
    expect(screen.getByText(assignments[1].title)).toBeVisible();
    expect(screen.queryByText(assignments[0].title)).not.toBeInTheDocument();
    expect(screen.queryByText(assignments[3].title)).not.toBeInTheDocument();
  });

  it("marks a task complete through the real hook and updates both status tabs", async () => {
    const user = renderApp();
    await user.click(screen.getByText(navigationStrings.assignments, { exact: true }));
    await user.click(screen.getByRole("tab", { name: commonStrings.toDo }));
    await user.click(screen.getAllByRole("button", { name: commonStrings.markComplete })[0]);

    expect(screen.queryByText(assignments[0].title)).not.toBeInTheDocument();
    expect(screen.getByText(assignments[1].title)).toBeVisible();
    expect(screen.getByText(assignmentStrings.completedNotification)).toBeVisible();
    expect(screen.getAllByRole("button", { name: commonStrings.markComplete })).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: commonStrings.completed }));
    expect(screen.getByText(assignments[0].title)).toBeVisible();
    expect(screen.getByText(assignments[2].title)).toBeVisible();
    expect(screen.queryByRole("button", { name: commonStrings.markComplete })).not.toBeInTheDocument();
  });

  it("updates the student's completion summary after completing an assignment", async () => {
    const user = renderApp();
    await user.click(screen.getByRole("radio", { name: appStrings.roles.student }));
    expect(screen.getByText(studentStrings.completionSummary(1, 4))).toBeVisible();
    const tasks = screen.getByRole("heading", { name: studentStrings.taskHeading }).parentElement;
    expect(tasks).not.toBeNull();
    if (!tasks) throw new Error("Student task section was not rendered");
    await user.click(within(tasks).getAllByRole("button", { name: commonStrings.done })[0]);
    expect(screen.getByText(studentStrings.completionSummary(2, 4))).toBeVisible();
    expect(within(tasks).getAllByRole("button", { name: commonStrings.done })).toHaveLength(1);
    expect(screen.getByText(assignments[0].title)).toBeVisible();
  });
});

describe("role rendering and navigation", () => {
  it.each([
    [navigationStrings.exams, parentStrings.exams.title],
    [navigationStrings.calendar, parentStrings.calendar.title],
    [navigationStrings.messages, parentStrings.messages.title],
  ])("opens the parent's %s page and returns to the overview", async (navigation, title) => {
    const user = renderApp();
    expect(screen.getByRole("heading", { name: parentStrings.dashboard.title })).toBeVisible();
    await user.click(screen.getByText(navigation, { exact: true }));
    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.queryByRole("heading", { name: parentStrings.dashboard.title })).not.toBeInTheDocument();
    await user.click(screen.getByText(navigationStrings.overview, { exact: true }));
    expect(screen.getByRole("heading", { name: parentStrings.dashboard.title })).toBeVisible();
  });

  it("renders each role's dashboard and navigation and resets the parent page on role change", async () => {
    const user = renderApp();
    await user.click(screen.getByText(navigationStrings.messages, { exact: true }));
    const roles = [
      {
        label: appStrings.roles.student,
        title: studentStrings.title,
        area: appStrings.areas.student,
        nav: navigationStrings.calendar,
        unavailable: navigationStrings.messages,
      },
      {
        label: appStrings.roles.teacher,
        title: teacherStrings.title,
        area: appStrings.areas.teacher,
        nav: navigationStrings.classes,
        unavailable: navigationStrings.calendar,
      },
      {
        label: appStrings.roles.admin,
        title: adminStrings.title,
        area: appStrings.areas.admin,
        nav: navigationStrings.staff,
        unavailable: navigationStrings.assignments,
      },
      {
        label: appStrings.roles.parent,
        title: parentStrings.dashboard.title,
        area: appStrings.areas.parent,
        nav: navigationStrings.messages,
        unavailable: navigationStrings.staff,
      },
    ];
    for (const role of roles) {
      await user.click(screen.getByRole("radio", { name: role.label }));
      expect(screen.getByRole("heading", { name: role.title })).toBeVisible();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByText(role.area)).toBeVisible();
      expect(screen.getByText(role.nav, { exact: true })).toBeVisible();
      expect(screen.queryByText(role.unavailable, { exact: true })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("heading", { name: parentStrings.messages.title })).not.toBeInTheDocument();
  });
});
