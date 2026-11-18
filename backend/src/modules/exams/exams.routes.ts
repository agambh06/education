import { Router } from "express";
import { z } from "zod";
import { examsService } from "./exams.service.js";
import { canAccessOwnStudentData, getPrincipal } from "../../auth/authorization.js";
export const examsRouter = Router();
const createExamSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  classId: z.string().min(1).optional(),
  topics: z.array(z.string()).default([]),
});
const studyTaskSchema = z.object({
  title: z.string().min(1),
  scheduledFor: z.string().min(1),
  durationMins: z.number().int().positive(),
});
examsRouter.get("/", (request, response) => {
  const principal = getPrincipal(response);
  if (!principal?.studentId || principal.role !== "STUDENT") {
    return response.status(403).json({ message: "Student access required" });
  }
  const classId = typeof request.query.classId === "string" ? request.query.classId : undefined;
  return response.json(examsService.list(principal.studentId, classId));
});
examsRouter.post("/", (request, response) => {
  const parsed = createExamSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  const principal = getPrincipal(response);
  if (!principal?.studentId || principal.role !== "STUDENT") {
    return response.status(403).json({ message: "Student access required" });
  }
  return response.status(201).json(examsService.publish({ ...parsed.data, studentId: principal.studentId }));
});
examsRouter.get("/:id/preparation", (request, response) => {
  const principal = getPrincipal(response);
  if (!principal?.studentId || principal.role !== "STUDENT") {
    return response.status(403).json({ message: "Student access required" });
  }
  const exam = examsService.get(request.params.id, principal.studentId);
  if (exam && !canAccessOwnStudentData(principal, exam.studentId)) {
    return response.status(404).json({ message: "Exam not found" });
  }
  return exam ? response.json(exam) : response.status(404).json({ message: "Exam not found" });
});
examsRouter.post("/:id/study-tasks", (request, response) => {
  const parsed = studyTaskSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json(parsed.error.flatten());
  const principal = getPrincipal(response);
  if (!principal?.studentId || principal.role !== "STUDENT") {
    return response.status(403).json({ message: "Student access required" });
  }
  const exam = examsService.get(request.params.id, principal.studentId);
  if (!exam || !canAccessOwnStudentData(principal, exam.studentId)) {
    return response.status(404).json({ message: "Exam not found" });
  }
  const task = examsService.addStudyTask(exam.id, parsed.data);
  return task ? response.status(201).json(task) : response.status(404).json({ message: "Exam not found" });
});
examsRouter.patch("/:examId/study-tasks/:taskId/complete", (request, response) => {
  const principal = getPrincipal(response);
  if (!principal?.studentId || principal.role !== "STUDENT") {
    return response.status(403).json({ message: "Student access required" });
  }
  const exam = examsService.get(request.params.examId, principal.studentId);
  if (!exam || !canAccessOwnStudentData(principal, exam.studentId)) {
    return response.status(404).json({ message: "Exam not found" });
  }
  const task = examsService.completeStudyTask(exam.id, request.params.taskId);
  return task ? response.json(task) : response.status(404).json({ message: "Study task not found" });
});
