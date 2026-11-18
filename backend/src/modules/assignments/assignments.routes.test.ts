import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const assignmentSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subject: z.string(),
    studentId: z.string(),
    studentName: z.string(),
    teacher: z.string(),
    status: z.enum(["TODO", "COMPLETED", "OVERDUE"]),
    dueAt: z.string().datetime(),
    description: z.string(),
  })
  .strict();

describe("assignment API", () => {
  let app: Express;
  let service: typeof import("./assignments.service.js").assignmentsService;
  let currentAssignment: Awaited<ReturnType<typeof import("./assignments.service.js").assignmentsService.list>>[number];

  beforeEach(async () => {
    vi.resetModules();
    const { createApp } = await import("../../app.js");
    app = createApp({
      resolveAuthenticatedUser: async () => ({ userId: "test-user", role: "STUDENT", studentId: "noa" }),
    });
    ({ assignmentsService: service } = await import("./assignments.service.js"));
    currentAssignment = {
      id: "a1",
      title: "דף תרגול שברים",
      description: "יש להשלים את שאלות 1–12 בדף העבודה המצורף.",
      studentId: "noa",
      status: "TODO",
      dueAt: new Date("2026-03-12T09:00:00.000Z"),
      subject: { name: "מתמטיקה" },
      teacher: { firstName: "יעל", lastName: "לוי" },
      student: { firstName: "נועה", lastName: "כהן" },
    } as unknown as typeof currentAssignment;
    vi.spyOn(service, "list").mockImplementation((studentId) =>
      Promise.resolve(studentId === currentAssignment.studentId ? [currentAssignment] : []) as ReturnType<
        typeof service.list
      >,
    );
    vi.spyOn(service, "complete").mockImplementation((id, studentId) => {
      if (id !== currentAssignment.id || studentId !== currentAssignment.studentId) {
        return Promise.resolve(undefined) as ReturnType<typeof service.complete>;
      }
      currentAssignment = { ...currentAssignment, status: "COMPLETED" };
      return Promise.resolve(currentAssignment) as ReturnType<typeof service.complete>;
    });
  });

  it("lists assignments with the expected response contract", async () => {
    const response = await request(app).get("/api/assignments").expect(200);

    const assignments = z.array(assignmentSchema).parse(response.body);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ id: "a1", studentId: "noa", status: "TODO" });
  });

  it("ignores client-supplied student IDs and uses the authenticated student", async () => {
    const matching = await request(app).get("/api/assignments").query({ studentId: "noa" }).expect(200);
    const missing = await request(app).get("/api/assignments").query({ studentId: "other" }).expect(200);

    expect(matching.body).toHaveLength(1);
    expect(matching.body.every((assignment: { studentId: string }) => assignment.studentId === "noa")).toBe(true);
    expect(missing.body).toEqual(matching.body);
  });

  it("completes an assignment and persists its status in subsequent reads", async () => {
    const response = await request(app).patch("/api/assignments/a1/complete").expect(200);
    expect(assignmentSchema.parse(response.body)).toMatchObject({ id: "a1", status: "COMPLETED" });

    const subsequent = await request(app).get("/api/assignments").query({ studentId: "noa" }).expect(200);
    expect(subsequent.body[0].status).toBe("COMPLETED");

    const repeated = await request(app).patch("/api/assignments/a1/complete").expect(200);
    expect(repeated.body).toEqual(response.body);
  });

  it("returns 404 for a missing assignment without modifying existing assignments", async () => {
    await request(app).patch("/api/assignments/missing/complete").expect(404, { message: "Assignment not found" });
    const response = await request(app).get("/api/assignments").expect(200);
    expect(response.body[0].status).toBe("TODO");
  });

  it("rejects a blank assignment ID before changing data", async () => {
    const complete = vi.spyOn(service, "complete");
    const response = await request(app).patch("/api/assignments/%20/complete").expect(400);

    expect(response.body.fieldErrors.id).toBeDefined();
    expect(complete).not.toHaveBeenCalled();
  });

  it("returns JSON for malformed JSON requests without changing assignments", async () => {
    const complete = vi.spyOn(service, "complete");
    await request(app)
      .patch("/api/assignments/a1/complete")
      .set("Content-Type", "application/json")
      .send('{"broken":')
      .expect(400, { message: "Invalid request" });
    expect(complete).not.toHaveBeenCalled();
  });

  it.each(["list", "complete"] as const)(
    "handles unexpected %s errors without exposing internal details",
    async (method) => {
      vi.spyOn(service, method).mockImplementation(() => {
        throw new Error("secret database details");
      });
      const operation =
        method === "list" ? request(app).get("/api/assignments") : request(app).patch("/api/assignments/a1/complete");

      await operation.expect(500, { message: "Internal server error" });
    },
  );

  it("does not expose or complete another student's assignment", async () => {
    const { createApp } = await import("../../app.js");
    const otherStudentApp = createApp({
      resolveAuthenticatedUser: async () => ({ userId: "other-user", role: "STUDENT", studentId: "other" }),
    });

    await request(otherStudentApp).get("/api/assignments").expect(200, []);
    await request(otherStudentApp)
      .patch("/api/assignments/a1/complete")
      .expect(404, { message: "Assignment not found" });
    expect((await request(app).get("/api/assignments").expect(200)).body[0].status).toBe("TODO");
  });

  it("rejects assignment access for a parent role", async () => {
    const { createApp } = await import("../../app.js");
    const parentApp = createApp({ resolveAuthenticatedUser: async () => ({ userId: "parent-user", role: "PARENT" }) });
    await request(parentApp).get("/api/assignments").expect(403, { message: "Student access required" });
  });

  it.todo("enforces parent, student, teacher and admin assignment permissions once roles exist");
});
