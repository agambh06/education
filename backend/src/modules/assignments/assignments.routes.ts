import { Router } from "express";
import { assignmentsService } from "./assignments.service.js";
export const assignmentsRouter = Router();
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

assignmentsRouter.get("/", async (request, response) => {
  const studentId = typeof request.query.studentId === "string" ? request.query.studentId : undefined;
  const assignments = await assignmentsService.list(studentId);
  response.json(assignments.map(toAssignmentResponse));
});
assignmentsRouter.patch("/:id/complete", async (request, response) => {
  const assignment = await assignmentsService.complete(request.params.id);
  if (!assignment) return response.status(404).json({ message: "Assignment not found" });
  return response.json(toAssignmentResponse(assignment));
});
