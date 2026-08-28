import { Router } from "express";
import { assignmentsService } from "./assignments.service.js";
export const assignmentsRouter = Router();
assignmentsRouter.get("/", (request, response) => {
  const studentId = typeof request.query.studentId === "string" ? request.query.studentId : undefined;
  response.json(assignmentsService.list(studentId));
});
assignmentsRouter.patch("/:id/complete", (request, response) => {
  const assignment = assignmentsService.complete(request.params.id);
  if (!assignment) return response.status(404).json({ message: "Assignment not found" });
  return response.json(assignment);
});
