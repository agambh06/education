import { Router } from "express";
import { z } from "zod";
import { assignmentsService } from "./assignments.service.js";

export const assignmentsRouter = Router();
const listAssignmentsSchema = z.object({ studentId: z.string().min(1).optional() });
const assignmentIdSchema = z.object({ id: z.string().trim().min(1) });

assignmentsRouter.get("/", (request, response) => {
  const parsed = listAssignmentsSchema.safeParse(request.query);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  return response.json(assignmentsService.list(parsed.data.studentId));
});
assignmentsRouter.patch("/:id/complete", (request, response) => {
  const parsed = assignmentIdSchema.safeParse(request.params);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  const assignment = assignmentsService.complete(parsed.data.id);
  if (!assignment) return response.status(404).json({ message: "Assignment not found" });
  return response.json(assignment);
});
