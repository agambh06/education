import { Router } from "express";
import { z } from "zod";
import { examsService } from "./exams.service.js";
export const examsRouter = Router();
const createExamSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  classId: z.string().min(1),
  studentId: z.string().min(1),
  topics: z.array(z.string()).default([]),
});
const studyTaskSchema = z.object({
  title: z.string().min(1),
  scheduledFor: z.string().min(1),
  durationMins: z.number().int().positive(),
});
examsRouter.get("/", (request, response) =>
  response.json(examsService.list(typeof request.query.studentId === "string" ? request.query.studentId : undefined)),
);
examsRouter.post("/", (request, response) => {
  const parsed = createExamSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  return response.status(201).json(examsService.publish(parsed.data));
});
examsRouter.get("/:id/preparation", (request, response) => {
  const exam = examsService.get(request.params.id);
  return exam ? response.json(exam) : response.status(404).json({ message: "Exam not found" });
});
examsRouter.post("/:id/study-tasks", (request, response) => {
  const parsed = studyTaskSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  const task = examsService.addStudyTask(request.params.id, parsed.data);
  return task ? response.status(201).json(task) : response.status(404).json({ message: "Exam not found" });
});
examsRouter.patch("/:examId/study-tasks/:taskId/complete", (request, response) => {
  const task = examsService.completeStudyTask(request.params.examId, request.params.taskId);
  return task ? response.json(task) : response.status(404).json({ message: "Study task not found" });
});
