import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const studyTaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    scheduledFor: z.string(),
    durationMins: z.number().int().positive(),
    completed: z.boolean(),
  })
  .strict();
const examSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subject: z.string(),
    classId: z.string(),
    studentId: z.string(),
    published: z.boolean(),
    topics: z.array(z.string()),
    studyTasks: z.array(studyTaskSchema),
  })
  .strict();

describe("exam preparation API", () => {
  let app: Express;

  beforeEach(async () => {
    vi.resetModules();
    ({ app } = await import("../../app.js"));
  });

  it("publishes an exam, schedules preparation and completes its study task", async () => {
    const published = await request(app)
      .post("/api/exams")
      .send({
        title: "Fractions",
        subject: "Math",
        classId: "6a",
        studentId: "other-student",
      })
      .expect(201);
    const exam = examSchema.parse(published.body);
    expect(exam).toMatchObject({ published: true, topics: [], studyTasks: [] });

    const listed = await request(app).get("/api/exams").query({ studentId: "other-student" }).expect(200);
    expect(listed.body).toEqual([exam]);
    const otherStudent = await request(app).get("/api/exams").query({ studentId: "noa" }).expect(200);
    expect(otherStudent.body.some((item: { id: string }) => item.id === exam.id)).toBe(false);

    const scheduled = await request(app)
      .post(`/api/exams/${exam.id}/study-tasks`)
      .send({
        title: "Practice fractions",
        scheduledFor: "Tomorrow",
        durationMins: 25,
      })
      .expect(201);
    const task = studyTaskSchema.parse(scheduled.body);
    expect(task.completed).toBe(false);

    const completed = await request(app).patch(`/api/exams/${exam.id}/study-tasks/${task.id}/complete`).expect(200);
    expect(studyTaskSchema.parse(completed.body)).toEqual({ ...task, completed: true });

    const preparation = await request(app).get(`/api/exams/${exam.id}/preparation`).expect(200);
    expect(examSchema.parse(preparation.body).studyTasks).toEqual([{ ...task, completed: true }]);
  });

  it.each([
    {},
    { title: "", subject: "Math", classId: "6a", studentId: "noa" },
    { title: "Math", subject: "Math", classId: "6a", studentId: "noa", topics: "fractions" },
  ])("rejects invalid exam publication input without creating an exam: %j", async (body) => {
    const response = await request(app).post("/api/exams").send(body).expect(400);
    expect(response.body).toMatchObject({ formErrors: [], fieldErrors: expect.any(Object) });

    const listed = await request(app).get("/api/exams").expect(200);
    expect(listed.body).toHaveLength(1);
  });

  it.each([0, -1, 1.5, "20"])("rejects invalid study durations without adding a task: %j", async (durationMins) => {
    const response = await request(app)
      .post("/api/exams/exam-1/study-tasks")
      .send({
        title: "Practice",
        scheduledFor: "Tomorrow",
        durationMins,
      })
      .expect(400);
    expect(response.body.fieldErrors.durationMins).toBeDefined();

    const preparation = await request(app).get("/api/exams/exam-1/preparation").expect(200);
    expect(preparation.body.studyTasks).toHaveLength(2);
  });

  it("returns 404 for missing exams and study tasks", async () => {
    await request(app).get("/api/exams/missing/preparation").expect(404, { message: "Exam not found" });
    await request(app)
      .post("/api/exams/missing/study-tasks")
      .send({ title: "Practice", scheduledFor: "Tomorrow", durationMins: 20 })
      .expect(404, { message: "Exam not found" });
    await request(app)
      .patch("/api/exams/exam-1/study-tasks/missing/complete")
      .expect(404, { message: "Study task not found" });
    await request(app)
      .patch("/api/exams/missing/study-tasks/study-1/complete")
      .expect(404, { message: "Study task not found" });
  });
});
