import assert from "node:assert/strict";
import test from "node:test";
import { mapApiAssignment } from "../src/services/assignmentMapper.mjs";

const statuses = { toDo: "לביצוע", completed: "הושלם", overdue: "באיחור" };

function createAssignment(overrides = {}) {
  return {
    id: "assignment-1",
    title: "Fractions worksheet",
    description: "Complete questions 1–12.",
    dueAt: "2099-03-12T09:00:00.000Z",
    status: "TODO",
    studentId: "student-from-database",
    subject: { name: "Math" },
    teacher: { firstName: "Yael", lastName: "Levi" },
    ...overrides,
  };
}

test("maps assignments while retaining the database student ID", () => {
  const assignment = mapApiAssignment(createAssignment(), statuses);

  assert.equal(assignment.studentId, "student-from-database");
  assert.equal(assignment.status, statuses.toDo);
  assert.equal(assignment.subject, "Math");
});

test("maps completed and overdue API statuses", () => {
  const completed = mapApiAssignment(createAssignment({ status: "COMPLETED" }), statuses);
  const overdue = mapApiAssignment(createAssignment({ status: "OVERDUE" }), statuses);

  assert.equal(completed.status, statuses.completed);
  assert.equal(overdue.status, statuses.overdue);
});

test("marks past due TODO assignments overdue", () => {
  const assignment = mapApiAssignment(createAssignment({ dueAt: "2000-03-12T09:00:00.000Z" }), statuses);

  assert.equal(assignment.status, statuses.overdue);
});
