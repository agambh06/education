import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma, PrismaClient } from "@prisma/client";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/education_api_test";

const { createAssignmentsService } = await import("../src/modules/assignments/assignments.service.js");

const assignment = {
  id: "assignment-1",
  studentId: "student-1",
  title: "Fractions practice",
  description: "Complete questions 1–12.",
  dueAt: new Date("2026-11-20T09:00:00.000Z"),
  status: "TODO",
  publication: "PUBLISHED",
  subject: { name: "Math" },
  teacher: { firstName: "Yael", lastName: "Levi" },
  student: { firstName: "Noa", lastName: "Cohen" },
};

test("lists published assignments scoped to the authenticated student", async () => {
  let query: Prisma.AssignmentFindManyArgs | undefined;
  const prisma = {
    assignment: {
      findMany: async (args: Prisma.AssignmentFindManyArgs) => {
        query = args;
        return [assignment];
      },
    },
  } as unknown as PrismaClient;
  const service = createAssignmentsService(prisma);

  assert.deepEqual(await service.list("student-1"), [assignment]);
  assert.deepEqual(query?.where, { publication: "PUBLISHED", studentId: "student-1" });
  assert.deepEqual(query?.include, { subject: true, teacher: true, student: true });
  assert.deepEqual(query?.orderBy, { dueAt: "asc" });
});

test("completion updates only the matching published assignment for that student", async () => {
  const calls: Array<[string, unknown]> = [];
  const prisma = {
    assignment: {
      updateMany: async (args: Prisma.AssignmentUpdateManyArgs) => {
        calls.push(["updateMany", args]);
        return { count: 1 };
      },
      findFirst: async (args: Prisma.AssignmentFindFirstArgs) => {
        calls.push(["findFirst", args]);
        return { ...assignment, status: "COMPLETED" };
      },
    },
  } as unknown as PrismaClient;
  const service = createAssignmentsService(prisma);

  assert.equal((await service.complete("assignment-1", "student-1"))?.status, "COMPLETED");
  assert.deepEqual(calls, [
    [
      "updateMany",
      {
        where: { id: "assignment-1", studentId: "student-1", publication: "PUBLISHED" },
        data: { status: "COMPLETED" },
      },
    ],
    [
      "findFirst",
      {
        where: { id: "assignment-1", studentId: "student-1" },
        include: { subject: true, teacher: true, student: true },
      },
    ],
  ]);
});

test("missing assignments are not read after the scoped update changes zero rows", async () => {
  let fetched = false;
  const prisma = {
    assignment: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async () => {
        fetched = true;
        return null;
      },
    },
  } as unknown as PrismaClient;
  const service = createAssignmentsService(prisma);

  assert.equal(await service.complete("missing", "student-1"), undefined);
  assert.equal(fetched, false);
});
