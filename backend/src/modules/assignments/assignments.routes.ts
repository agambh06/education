import { Router } from "express";
import { z } from "zod";
import { assignmentsService } from "./assignments.service.js";
import { canAccessOwnStudentData, getPrincipal } from "../../auth/authorization.js";

export const assignmentsRouter = Router();
const assignmentIdSchema = z.object({ id: z.string().trim().min(1) });

assignmentsRouter.get("/", (_request, response) => {
  const principal = getPrincipal(response);
  if (principal?.role !== "STUDENT" || !principal.studentId) {
    return response.status(403).json({ message: "Student access required" });
  }
  return response.json(assignmentsService.list(principal.studentId));
});
assignmentsRouter.patch("/:id/complete", (request, response) => {
  const parsed = assignmentIdSchema.safeParse(request.params);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  const principal = getPrincipal(response);
  if (principal?.role !== "STUDENT" || !principal.studentId) {
    return response.status(403).json({ message: "Student access required" });
  }
  const existing = assignmentsService.list(principal.studentId).find((item) => item.id === parsed.data.id);
  if (!existing || !canAccessOwnStudentData(principal, existing.studentId)) {
    return response.status(404).json({ message: "Assignment not found" });
  }
  const assignment = assignmentsService.complete(parsed.data.id, principal.studentId);
  if (!assignment) return response.status(404).json({ message: "Assignment not found" });
  return response.json(assignment);
});
