import { Router } from "express";
import { z } from "zod";
import { getPrincipal } from "../../auth/authorization.js";
import { assignmentsService } from "./assignments.service.js";

export const assignmentsRouter = Router();
const assignmentIdSchema = z.object({ id: z.string().trim().min(1) });

function toAssignmentResponse(
  assignment:
    | Awaited<ReturnType<typeof assignmentsService.list>>[number]
    | NonNullable<Awaited<ReturnType<typeof assignmentsService.complete>>>,
) {
  return {
    id: assignment.id,
    studentId: assignment.studentId,
    studentName: `${assignment.student.firstName} ${assignment.student.lastName}`,
    subject: assignment.subject.name,
    teacher: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
    title: assignment.title,
    dueAt: assignment.dueAt.toISOString(),
    status: assignment.status,
    description: assignment.description,
  };
}

assignmentsRouter.get("/", async (_request, response) => {
  const principal = getPrincipal(response);
  if (principal?.role !== "STUDENT" || !principal.studentId) {
    return response.status(403).json({ message: "Student access required" });
  }

  const assignments = await assignmentsService.list(principal.studentId);
  return response.json(assignments.map(toAssignmentResponse));
});

assignmentsRouter.patch("/:id/complete", async (request, response) => {
  const parsed = assignmentIdSchema.safeParse(request.params);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());

  const principal = getPrincipal(response);
  if (principal?.role !== "STUDENT" || !principal.studentId) {
    return response.status(403).json({ message: "Student access required" });
  }

  const assignment = await assignmentsService.complete(parsed.data.id, principal.studentId);
  if (!assignment) return response.status(404).json({ message: "Assignment not found" });
  return response.json(toAssignmentResponse(assignment));
});
