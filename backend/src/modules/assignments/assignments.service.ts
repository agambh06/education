import { PrismaClient } from "@prisma/client";

export function createAssignmentsService(prisma: PrismaClient) {
  return {
    list: (studentId?: string) =>
      prisma.assignment.findMany({
        where: {
          publication: "PUBLISHED",
          ...(studentId ? { studentId } : {}),
        },
        include: { subject: true, teacher: true, student: true },
        orderBy: { dueAt: "asc" },
      }),
    complete: async (id: string) => {
      const result = await prisma.assignment.updateMany({
        where: { id, publication: "PUBLISHED" },
        data: { status: "COMPLETED" },
      });

      if (result.count === 0) return undefined;

      return prisma.assignment.findUnique({
        where: { id },
        include: { subject: true, teacher: true, student: true },
      });
    },
  };
}

export const assignmentsService = createAssignmentsService(new PrismaClient());
