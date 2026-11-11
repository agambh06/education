import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

const prisma = new PrismaClient({ datasourceUrl: inject("testDatabaseUrl") });
let studentId: string;
let otherStudentId: string;
let classId: string;
let subjectId: string;
let teacherId: string;

beforeAll(async () => {
  const schoolYear = await prisma.schoolYear.create({
    data: { name: "Test school year", startsOn: new Date("2026-09-01"), endsOn: new Date("2027-07-01") },
  });
  const schoolClass = await prisma.class.create({ data: { name: "Test class", schoolYearId: schoolYear.id } });
  classId = schoolClass.id;
  const subject = await prisma.subject.create({ data: { name: "Test subject" } });
  subjectId = subject.id;
  const teacher = await prisma.user.create({
    data: { email: "teacher@example.test", firstName: "Test", lastName: "Teacher", role: "TEACHER" },
  });
  teacherId = teacher.id;
  const student = await prisma.student.create({ data: { firstName: "First", lastName: "Student", classId } });
  studentId = student.id;
  const otherStudent = await prisma.student.create({ data: { firstName: "Other", lastName: "Student", classId } });
  otherStudentId = otherStudent.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.assignment.deleteMany();
});

function assignmentData(id: string, targetStudentId: string) {
  return {
    id,
    title: "Integration assignment",
    description: "Read/write fixture",
    dueAt: new Date("2026-11-10T09:00:00Z"),
    classId,
    subjectId,
    teacherId,
    studentId: targetStudentId,
  };
}

describe("assignment persistence in an isolated schema", () => {
  it("creates assignments with defaults and reads only the requested student's records", async () => {
    const firstAssignmentId = randomUUID();
    const secondAssignmentId = randomUUID();
    await prisma.assignment.createMany({
      data: [assignmentData(firstAssignmentId, studentId), assignmentData(secondAssignmentId, otherStudentId)],
    });

    const assignments = await prisma.assignment.findMany({ where: { studentId } });
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ id: firstAssignmentId, studentId, status: "TODO", publication: "DRAFT" });
    expect(assignments[0]?.dueAt).toEqual(new Date("2026-11-10T09:00:00Z"));
  });

  it("persists completion without changing another student's assignment", async () => {
    const ownId = randomUUID();
    const otherId = randomUUID();
    await prisma.assignment.createMany({
      data: [assignmentData(ownId, studentId), assignmentData(otherId, otherStudentId)],
    });
    await prisma.assignment.update({ where: { id: ownId }, data: { status: "COMPLETED" } });

    expect(await prisma.assignment.findUniqueOrThrow({ where: { id: ownId } })).toMatchObject({ status: "COMPLETED" });
    expect(await prisma.assignment.findUniqueOrThrow({ where: { id: otherId } })).toMatchObject({ status: "TODO" });
  });

  it("rejects references to a nonexistent student without inserting a record", async () => {
    const id = randomUUID();
    await expect(prisma.assignment.create({ data: assignmentData(id, "missing-student") })).rejects.toMatchObject({
      code: "P2003",
    });
    expect(await prisma.assignment.findUnique({ where: { id } })).toBeNull();
  });

  it("rolls back all writes when one assignment in a transaction fails", async () => {
    const id = randomUUID();
    await expect(
      prisma.$transaction([
        prisma.assignment.create({ data: assignmentData(id, studentId) }),
        prisma.assignment.create({ data: assignmentData(randomUUID(), "missing-student") }),
      ]),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(await prisma.assignment.findUnique({ where: { id } })).toBeNull();
  });

  it("reports a missing assignment update instead of creating a record", async () => {
    await expect(
      prisma.assignment.update({ where: { id: "missing-assignment" }, data: { status: "COMPLETED" } }),
    ).rejects.toMatchObject({ code: "P2025" });
  });
});
