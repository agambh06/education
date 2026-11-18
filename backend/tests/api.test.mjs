import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "node:http";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/education_web?schema=public";
process.env.NODE_ENV = "test";

const [{ app }, { assignmentsService, createAssignmentsService }] = await Promise.all([
  import("../src/app.ts"),
  import("../src/modules/assignments/assignments.service.ts"),
]);

const originalList = assignmentsService.list;
const originalComplete = assignmentsService.complete;
const dueAt = new Date("2026-11-20T09:00:00.000Z");
const fixture = {
  id: "assignment-1",
  studentId: "student-1",
  title: "Fractions practice",
  description: "Complete questions 1–12.",
  dueAt,
  status: "TODO",
  publication: "PUBLISHED",
  subject: { name: "Math" },
  teacher: { firstName: "Yael", lastName: "Levi" },
  student: { firstName: "Noa", lastName: "Cohen" },
};
let server;
let baseUrl;

before(async () => {
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

afterEach(() => {
  assignmentsService.list = originalList;
  assignmentsService.complete = originalComplete;
});

test("list filters by published status and requested student", async () => {
  let query;
  const service = createAssignmentsService({
    assignment: {
      findMany: async (args) => {
        query = args;
        return [fixture];
      },
    },
  });

  assert.deepEqual(await service.list("student-1"), [fixture]);
  assert.deepEqual(query.where, { publication: "PUBLISHED", studentId: "student-1" });
  assert.deepEqual(query.include, { subject: true, teacher: true, student: true });
  assert.deepEqual(query.orderBy, { dueAt: "asc" });
});

test("list includes all published assignments when no student is selected", async () => {
  let query;
  const service = createAssignmentsService({
    assignment: {
      findMany: async (args) => {
        query = args;
        return [];
      },
    },
  });

  assert.deepEqual(await service.list(), []);
  assert.deepEqual(query.where, { publication: "PUBLISHED" });
});

test("completion persists COMPLETED status and fetches the updated assignment", async () => {
  const calls = [];
  const service = createAssignmentsService({
    assignment: {
      updateMany: async (args) => {
        calls.push(["updateMany", args]);
        return { count: 1 };
      },
      findUnique: async (args) => {
        calls.push(["findUnique", args]);
        return { ...fixture, status: "COMPLETED" };
      },
    },
  });

  assert.equal((await service.complete("assignment-1")).status, "COMPLETED");
  assert.deepEqual(calls, [
    [
      "updateMany",
      { where: { id: "assignment-1", publication: "PUBLISHED" }, data: { status: "COMPLETED" } },
    ],
    ["findUnique", { where: { id: "assignment-1" }, include: { subject: true, teacher: true, student: true } }],
  ]);
});

test("completion returns no assignment when the published record does not exist", async () => {
  let fetched = false;
  const service = createAssignmentsService({
    assignment: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => {
        fetched = true;
        return null;
      },
    },
  });

  assert.equal(await service.complete("missing"), undefined);
  assert.equal(fetched, false);
});

test("GET assignments returns the API response shape", async () => {
  assignmentsService.list = async () => [fixture];

  const response = await fetch(`${baseUrl}/api/assignments`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    {
      id: "assignment-1",
      studentId: "student-1",
      studentName: "Noa Cohen",
      subject: "Math",
      teacher: "Yael Levi",
      title: "Fractions practice",
      dueAt: dueAt.toISOString(),
      status: "TODO",
      description: "Complete questions 1–12.",
    },
  ]);
});

test("GET assignments forwards the student filter", async () => {
  let receivedStudentId;
  assignmentsService.list = async (studentId) => {
    receivedStudentId = studentId;
    return [];
  };

  const response = await fetch(`${baseUrl}/api/assignments?studentId=student-1`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  assert.equal(receivedStudentId, "student-1");
});

test("PATCH completion returns the persisted assignment", async () => {
  let completedId;
  assignmentsService.complete = async (id) => {
    completedId = id;
    return { ...fixture, status: "COMPLETED" };
  };

  const response = await fetch(`${baseUrl}/api/assignments/assignment-1/complete`, { method: "PATCH" });
  assert.equal(response.status, 200);
  assert.equal(completedId, "assignment-1");
  assert.equal((await response.json()).status, "COMPLETED");
});

test("PATCH completion returns 404 for an unknown assignment", async () => {
  assignmentsService.complete = async () => undefined;

  const response = await fetch(`${baseUrl}/api/assignments/missing/complete`, { method: "PATCH" });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Assignment not found" });
});

test("GET health reports the API as ready", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("GET notifications returns notification records", async () => {
  const response = await fetch(`${baseUrl}/api/notifications`);
  const notifications = await response.json();

  assert.equal(response.status, 200);
  assert.equal(notifications[0].id, "n1");
  assert.equal(notifications[0].type, "ASSIGNMENT");
  assert.equal(typeof notifications[0].createdAt, "string");
});

test("GET exams filters to the requested student's published exams", async () => {
  const response = await fetch(`${baseUrl}/api/exams?studentId=noa`);
  const exams = await response.json();

  assert.equal(response.status, 200);
  assert.ok(exams.length > 0);
  assert.ok(exams.every((exam) => exam.studentId === "noa" && exam.published));
});

test("POST exams validates input and applies default topics", async () => {
  const invalidResponse = await fetch(`${baseUrl}/api/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "", subject: "Math", classId: "class-1", studentId: "student-1" }),
  });
  assert.equal(invalidResponse.status, 400);

  const response = await fetch(`${baseUrl}/api/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Unit test", subject: "Math", classId: "class-1", studentId: "student-1" }),
  });
  const created = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(created.topics, []);
  assert.equal(created.published, true);
  assert.deepEqual(created.studyTasks, []);
});

test("GET exam preparation returns 404 for an unknown exam", async () => {
  const response = await fetch(`${baseUrl}/api/exams/missing/preparation`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Exam not found" });
});

test("POST study tasks rejects invalid duration and missing exams", async () => {
  const invalidResponse = await fetch(`${baseUrl}/api/exams/exam-1/study-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Review", scheduledFor: "Tomorrow", durationMins: 0 }),
  });
  assert.equal(invalidResponse.status, 400);

  const missingExamResponse = await fetch(`${baseUrl}/api/exams/missing/study-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Review", scheduledFor: "Tomorrow", durationMins: 20 }),
  });
  assert.equal(missingExamResponse.status, 404);
  assert.deepEqual(await missingExamResponse.json(), { message: "Exam not found" });
});

test("study task creation and completion update the task state", async () => {
  const createResponse = await fetch(`${baseUrl}/api/exams/exam-1/study-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Review planets", scheduledFor: "Tomorrow", durationMins: 25 }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(created.completed, false);
  assert.equal(created.title, "Review planets");

  const completeResponse = await fetch(`${baseUrl}/api/exams/exam-1/study-tasks/${created.id}/complete`, {
    method: "PATCH",
  });
  assert.equal(completeResponse.status, 200);
  assert.equal((await completeResponse.json()).completed, true);
});

test("PATCH study task completion returns 404 for a missing task", async () => {
  const response = await fetch(`${baseUrl}/api/exams/exam-1/study-tasks/missing/complete`, { method: "PATCH" });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Study task not found" });
});
