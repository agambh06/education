import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

const schema = `parent_link_migration_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(inject("testDatabaseUrl"));
databaseUrl.searchParams.set("schema", schema);
const prisma = new PrismaClient({ datasourceUrl: databaseUrl.toString() });
let schemaCreated = false;
let originalSchoolData: unknown[];

async function applyMigration(name: string) {
  const migration = await readFile(new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8");
  // These repository migrations contain plain statements, without SQL functions
  // or quoted semicolons. Execute them separately because Prisma uses prepared statements.
  for (const statement of migration.split(";").filter((part) => part.trim())) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function schoolData() {
  return Promise.all([
    prisma.$queryRaw`SELECT * FROM "SchoolYear" ORDER BY "id"`,
    prisma.$queryRaw`SELECT * FROM "Class" ORDER BY "id"`,
    prisma.$queryRaw`
      SELECT "id", "email", "firstName", "lastName", "role", "createdAt", "updatedAt"
      FROM "User" ORDER BY "id"
    `,
    prisma.$queryRaw`
      SELECT "id", "firstName", "lastName", "classId", "createdAt", "updatedAt"
      FROM "Student" ORDER BY "id"
    `,
    prisma.$queryRaw`SELECT * FROM "Subject" ORDER BY "id"`,
    prisma.$queryRaw`SELECT * FROM "Assignment" ORDER BY "id"`,
  ]);
}

beforeAll(async () => {
  // Only this generated schema is created or removed; the supplied isolated
  // database and other integration suites' schemas remain intact.
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  await applyMigration("20261112000000_baseline");
  await prisma.$executeRaw`
    INSERT INTO "SchoolYear" ("id", "name", "startsOn", "endsOn")
    VALUES ('year', '2026', '2026-09-01', '2027-07-01')
  `;
  await prisma.$executeRaw`
    INSERT INTO "Class" ("id", "name", "schoolYearId") VALUES ('class', 'A', 'year')
  `;
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "email", "firstName", "lastName", "role", "updatedAt") VALUES
      ('parent', 'parent@example.test', 'Parent', 'Example', 'PARENT', CURRENT_TIMESTAMP),
      ('teacher', 'teacher@example.test', 'Teacher', 'Example', 'TEACHER', CURRENT_TIMESTAMP)
  `;
  await prisma.$executeRaw`
    INSERT INTO "Student" ("id", "firstName", "lastName", "classId", "updatedAt")
    VALUES ('student', 'Student', 'Example', 'class', CURRENT_TIMESTAMP)
  `;
  await prisma.$executeRaw`
    INSERT INTO "ParentStudent" ("parentId", "studentId") VALUES ('parent', 'student')
  `;
  await prisma.$executeRaw`INSERT INTO "Subject" ("id", "name") VALUES ('subject', 'Math')`;
  await prisma.$executeRaw`
    INSERT INTO "Assignment"
      ("id", "title", "description", "dueAt", "classId", "subjectId", "teacherId", "studentId", "updatedAt")
    VALUES
      ('assignment', 'Preserved lesson', 'Keep this content', '2026-12-01',
       'class', 'subject', 'teacher', 'student', CURRENT_TIMESTAMP)
  `;
  originalSchoolData = await schoolData();
  await applyMigration("20261112000100_verified_parent_links");
});

afterAll(async () => {
  try {
    if (schemaCreated) {
      await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe("verified parent link migration from the existing school schema", () => {
  it("preserves school data and revokes legacy associations without granting verified access", async () => {
    expect(await schoolData()).toEqual(originalSchoolData);
    const legacy = await prisma.parentStudent.findUniqueOrThrow({
      where: { parentId_studentId: { parentId: "parent", studentId: "student" } },
    });
    expect(legacy).toMatchObject({
      id: "legacy_6_parent_student",
      parentId: "parent",
      studentId: "student",
      status: "REVOKED",
      revokedById: "migration:20261112000100_verified_parent_links",
      verifiedAt: null,
      verifiedById: null,
      consentVersion: null,
      guardianVerificationId: null,
    });
    expect(legacy.revokedAt).toBeInstanceOf(Date);
    expect(await prisma.parentStudent.count({ where: { status: "VERIFIED" } })).toBe(0);
    expect(await prisma.student.findUniqueOrThrow({ where: { id: "student" } })).toMatchObject({
      userId: null,
      parentLinkConsentRequirement: "UNKNOWN",
    });
    expect(await prisma.user.count({ where: { accountVerifiedAt: { not: null } } })).toBe(0);
  });

  it("allows an independent student profile while keeping account identity unique and unverified by default", async () => {
    const user = await prisma.user.create({
      data: {
        email: "independent@example.test",
        firstName: "Independent",
        lastName: "Student",
        role: "STUDENT",
      },
    });
    const student = await prisma.student.create({
      data: { firstName: "Independent", lastName: "Student", userId: user.id },
    });
    expect(user.accountVerifiedAt).toBeNull();
    expect(student).toMatchObject({ userId: user.id, classId: null, parentLinkConsentRequirement: "UNKNOWN" });
    await expect(
      prisma.student.create({ data: { firstName: "Duplicate", lastName: "Account", userId: user.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.student.count({ where: { userId: user.id } })).toBe(1);
  });
});
