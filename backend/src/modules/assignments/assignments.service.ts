import type { PrismaClient } from "@prisma/client";
import { database } from "../../config/database.js";

export function createAssignmentsService(prisma: PrismaClient) {
  return {
    list: (studentId: string) =>
      prisma.assignment.findMany({
        where: { publication: "PUBLISHED", studentId },
        include: { subject: true, teacher: true, student: true },
        orderBy: { dueAt: "asc" },
      }),
    complete: async (id: string, studentId: string) => {
      const result = await prisma.assignment.updateMany({
        where: { id, studentId, publication: "PUBLISHED" },
        data: { status: "COMPLETED" },
      });

      if (result.count === 0) return undefined;

      return (
        (await prisma.assignment.findFirst({
          where: { id, studentId },
          include: { subject: true, teacher: true, student: true },
        })) ?? undefined
      );
    },
  };
}

export const assignmentsService = {
  list: (studentId: string) => createAssignmentsService(database()).list(studentId),
  complete: (id: string, studentId: string) => createAssignmentsService(database()).complete(id, studentId),
};
