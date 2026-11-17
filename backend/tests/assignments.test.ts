import assert from "node:assert/strict";
import { test } from "node:test";
import type { DemoAssignment } from "../src/modules/assignments/assignments.service.js";
import { setupTestApi } from "./api.js";

const requestJson = setupTestApi();

test("GET /api/assignments lists assignments and filters by student", async () => {
  const assignments = await requestJson<DemoAssignment[]>("/api/assignments", 200);
  assert.equal(assignments.length, 1);
  assert(["TODO", "COMPLETED", "OVERDUE"].includes(assignments[0].status));
  assert.deepEqual(assignments[0], {
    id: "a1",
    title: "דף תרגול שברים",
    subject: "מתמטיקה",
    studentId: "noa",
    status: assignments[0].status,
    dueAt: "2026-03-12T09:00:00.000Z",
  });
  assert.deepEqual(await requestJson("/api/assignments?studentId=noa", 200), assignments);
  assert.deepEqual(await requestJson("/api/assignments?studentId=unknown-student", 200), []);
});

test("PATCH /api/assignments/:id/complete persists completion and is idempotent", async () => {
  const [original] = await requestJson<DemoAssignment[]>("/api/assignments?studentId=noa", 200);
  assert(original);
  assert.equal(original.status, "TODO");

  const completed = await requestJson<DemoAssignment>(`/api/assignments/${original.id}/complete`, 200, {
    method: "PATCH",
  });
  assert.deepEqual(completed, { ...original, status: "COMPLETED" });
  assert.deepEqual(await requestJson("/api/assignments?studentId=noa", 200), [completed]);
  assert.deepEqual(await requestJson(`/api/assignments/${original.id}/complete`, 200, { method: "PATCH" }), completed);
  assert.deepEqual(await requestJson("/api/assignments?studentId=noa", 200), [completed]);
});

test("completing a missing assignment returns 404 without changing assignments", async () => {
  const before = await requestJson("/api/assignments", 200);
  assert.deepEqual(await requestJson("/api/assignments/missing/complete", 404, { method: "PATCH" }), {
    message: "Assignment not found",
  });
  assert.deepEqual(await requestJson("/api/assignments", 200), before);
});
