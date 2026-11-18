import type { PrismaClient } from "@prisma/client";
import type { AuthenticatedPrincipal } from "../../auth/authorization.js";
import { assertVerifiedParentLink, ParentLinkError } from "../parent-links/parent-links.service.js";

async function linkedStudentIds(prisma: PrismaClient, principal: AuthenticatedPrincipal) {
  if (principal.role === "STUDENT") return principal.studentId ? [principal.studentId] : [];
  if (principal.role === "ADMIN") return undefined;
  if (principal.role === "TEACHER") {
    const students = await prisma.student.findMany({
      where: { class: { is: { teaching: { some: { teacherId: principal.userId } } } } },
      select: { id: true },
    });
    return students.map(({ id }) => id);
  }

  const links = await prisma.parentStudent.findMany({
    where: { parentId: principal.userId, status: "VERIFIED" },
    select: { studentId: true },
  });
  const accessibleIds: string[] = [];
  for (const { studentId } of links) {
    try {
      await prisma.$transaction((transaction) =>
        assertVerifiedParentLink(transaction, principal.userId, studentId, new Date()),
      );
      accessibleIds.push(studentId);
    } catch (error) {
      if (!(error instanceof ParentLinkError) || error.status !== 403) throw error;
    }
  }
  return accessibleIds;
}

export function createSchoolStructureService(prisma: PrismaClient) {
  return {
    async listStudents(principal: AuthenticatedPrincipal, classId?: string) {
      const studentIds = await linkedStudentIds(prisma, principal);
      return prisma.student.findMany({
        where: {
          ...(studentIds ? { id: { in: studentIds } } : {}),
          ...(classId ? { classId } : {}),
          ...(principal.role === "TEACHER"
            ? { class: { is: { teaching: { some: { teacherId: principal.userId } } } } }
            : {}),
        },
        select: { id: true, firstName: true, lastName: true, classId: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    },

    async listClasses(principal: AuthenticatedPrincipal, schoolYearId?: string) {
      const studentIds = await linkedStudentIds(prisma, principal);
      const classes = await prisma.class.findMany({
        where: {
          ...(schoolYearId ? { schoolYearId } : {}),
          ...(principal.role === "ADMIN"
            ? {}
            : principal.role === "TEACHER"
              ? { teaching: { some: { teacherId: principal.userId } } }
              : { students: { some: { id: { in: studentIds ?? [] } } } }),
        },
        select: { id: true, name: true, _count: { select: { students: true } } },
        orderBy: { name: "asc" },
      });
      return classes.map(({ _count, ...schoolClass }) => ({ ...schoolClass, studentCount: _count.students }));
    },

    async listSubjects(principal: AuthenticatedPrincipal, classId?: string) {
      const studentIds = await linkedStudentIds(prisma, principal);
      const studentClasses =
        principal.role === "ADMIN" || principal.role === "TEACHER"
          ? undefined
          : await prisma.student.findMany({
              where: { id: { in: studentIds ?? [] }, ...(classId ? { classId } : {}) },
              select: { classId: true },
            });
      const classIds = studentClasses?.flatMap(({ classId: id }) => (id ? [id] : []));
      return prisma.subject.findMany({
        where:
          principal.role === "ADMIN"
            ? classId
              ? { teaching: { some: { classId } } }
              : undefined
            : principal.role === "TEACHER"
              ? { teaching: { some: { teacherId: principal.userId, ...(classId ? { classId } : {}) } } }
              : classIds?.length
                ? { teaching: { some: { classId: { in: classIds } } } }
                : { id: { in: [] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    },
  };
}
