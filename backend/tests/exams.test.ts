import assert from "node:assert/strict";
import { test } from "node:test";
import type { DemoExam, DemoStudyTask } from "../src/modules/exams/exams.service.js";
import { jsonBody, setupTestApi, type ValidationError } from "./api.js";

const requestJson = setupTestApi();
const examInput = {
  title: "Fractions exam",
  subject: "Mathematics",
  classId: "6b",
  studentId: "test-student",
};
const studyTaskInput = { title: "Practice fractions", scheduledFor: "2026-11-10", durationMins: 20 };

test("GET /api/exams lists exams and filters by student", async () => {
  const exams = await requestJson<DemoExam[]>("/api/exams", 200);
  const seededExam = exams.find((exam) => exam.id === "exam-1");
  assert.deepEqual(seededExam, {
    id: "exam-1",
    title: "מערכת השמש",
    subject: "מדעים",
    classId: "6a",
    studentId: "noa",
    published: true,
    topics: ["כוכבי לכת", "סיבוב כדור הארץ", "מערכת השמש"],
    studyTasks: [
      { id: "study-1", title: "לתרגל כוכבי לכת", scheduledFor: "היום", durationMins: 20, completed: true },
      { id: "study-2", title: "לפתור שאלות תרגול", scheduledFor: "מחר", durationMins: 30, completed: false },
    ],
  });
  assert.deepEqual(await requestJson("/api/exams?studentId=noa", 200), [seededExam]);
  assert.deepEqual(await requestJson("/api/exams?studentId=unknown-student", 200), []);
});

test("POST /api/exams publishes exams, defaults topics, and keeps student lists separate", async () => {
  const input = { ...examInput, studentId: "published-student" };
  const created = await requestJson<DemoExam>("/api/exams", 201, jsonBody(input));
  assert.match(created.id, /^exam-/);
  assert.deepEqual(created, { ...input, id: created.id, published: true, topics: [], studyTasks: [] });
  const otherInput = { ...examInput, studentId: "another-student", topics: ["Decimals"] };
  const other = await requestJson<DemoExam>("/api/exams", 201, jsonBody(otherInput));
  assert.notEqual(other.id, created.id);
  assert.deepEqual(other, { ...otherInput, id: other.id, published: true, studyTasks: [] });

  assert.deepEqual(await requestJson("/api/exams?studentId=published-student", 200), [created]);
  assert.deepEqual(await requestJson("/api/exams?studentId=another-student", 200), [other]);
  assert.deepEqual(await requestJson(`/api/exams/${created.id}/preparation`, 200), created);
  const all = await requestJson<DemoExam[]>("/api/exams", 200);
  assert(all.some((exam) => exam.id === created.id));
  assert(all.some((exam) => exam.id === other.id));
});

const invalidExams = [
  { name: "missing required fields", body: {}, fields: ["title", "subject", "classId", "studentId"] },
  {
    name: "empty required fields",
    body: { title: "", subject: "", classId: "", studentId: "" },
    fields: ["title", "subject", "classId", "studentId"],
  },
  { name: "wrong field types", body: { ...examInput, title: 42, topics: "Fractions" }, fields: ["title", "topics"] },
  { name: "invalid topic items", body: { ...examInput, topics: [42] }, fields: ["topics"] },
];

for (const { name, body, fields } of invalidExams) {
  test(`POST /api/exams rejects ${name} without publishing an exam`, async () => {
    const before = await requestJson("/api/exams", 200);
    const error = await requestJson<ValidationError>("/api/exams", 400, jsonBody(body));
    assert.deepEqual(error.formErrors, []);
    assert.deepEqual(Object.keys(error.fieldErrors).sort(), [...fields].sort());
    for (const field of fields) assert(error.fieldErrors[field].length > 0);
    assert.deepEqual(await requestJson("/api/exams", 200), before);
  });
}

test("study tasks can be added and completed, with changes visible in preparation", async () => {
  const exam = await requestJson<DemoExam>(
    "/api/exams",
    201,
    jsonBody({ ...examInput, studentId: "study-task-student" }),
  );
  const task = await requestJson<DemoStudyTask>(`/api/exams/${exam.id}/study-tasks`, 201, jsonBody(studyTaskInput));
  assert.match(task.id, /^study-/);
  assert.deepEqual(task, { ...studyTaskInput, id: task.id, completed: false });
  assert.deepEqual(await requestJson(`/api/exams/${exam.id}/preparation`, 200), { ...exam, studyTasks: [task] });

  const completionPath = `/api/exams/${exam.id}/study-tasks/${task.id}/complete`;
  const completed = { ...task, completed: true };
  assert.deepEqual(await requestJson(completionPath, 200, { method: "PATCH" }), completed);
  assert.deepEqual(await requestJson(completionPath, 200, { method: "PATCH" }), completed);
  assert.deepEqual(await requestJson(`/api/exams/${exam.id}/preparation`, 200), { ...exam, studyTasks: [completed] });
});

const invalidTasks = [
  { name: "missing fields", body: {}, fields: ["title", "scheduledFor", "durationMins"] },
  { name: "empty title", body: { ...studyTaskInput, title: "" }, fields: ["title"] },
  { name: "empty schedule", body: { ...studyTaskInput, scheduledFor: "" }, fields: ["scheduledFor"] },
  ...[0, -1, 1.5, "20"].map((durationMins) => ({
    name: `invalid duration ${JSON.stringify(durationMins)}`,
    body: { ...studyTaskInput, durationMins },
    fields: ["durationMins"],
  })),
];

for (const { name, body, fields } of invalidTasks) {
  test(`POST study tasks rejects ${name} without changing preparation`, async () => {
    const exam = await requestJson<DemoExam>("/api/exams", 201, jsonBody(examInput));
    const error = await requestJson<ValidationError>(`/api/exams/${exam.id}/study-tasks`, 400, jsonBody(body));
    assert.deepEqual(Object.keys(error.fieldErrors).sort(), [...fields].sort());
    for (const field of fields) assert(error.fieldErrors[field].length > 0);
    assert.deepEqual(await requestJson(`/api/exams/${exam.id}/preparation`, 200), exam);
  });
}

test("missing exams and study tasks return 404 without changing existing exams", async () => {
  const before = await requestJson("/api/exams", 200);
  assert.deepEqual(await requestJson("/api/exams/missing/preparation", 404), { message: "Exam not found" });
  assert.deepEqual(await requestJson("/api/exams/missing/study-tasks", 404, jsonBody(studyTaskInput)), {
    message: "Exam not found",
  });
  for (const path of [
    "/api/exams/missing/study-tasks/study-1/complete",
    "/api/exams/exam-1/study-tasks/missing/complete",
  ]) {
    assert.deepEqual(await requestJson(path, 404, { method: "PATCH" }), { message: "Study task not found" });
  }
  assert.deepEqual(await requestJson("/api/exams", 200), before);
});
