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
    status: z.enum(["TODO", "COMPLETED", "OVERDUE"]),
    dueAt: z.string().datetime(),
  })
  .strict();

describe("assignment API", () => {
  let app: Express;
  let service: typeof import("./assignments.service.js").assignmentsService;

  beforeEach(async () => {
    // Each test gets fresh demo data, so completing an assignment cannot affect another test.
    vi.resetModules();
    ({ app } = await import("../../app.js"));
    ({ assignmentsService: service } = await import("./assignments.service.js"));
  });

  it("lists assignments with the expected response contract", async () => {
    const response = await request(app).get("/api/assignments").expect(200);

    const assignments = z.array(assignmentSchema).parse(response.body);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ id: "a1", studentId: "noa", status: "TODO" });
  });

  it("filters assignments by student and returns an empty list for an unknown student", async () => {
    const matching = await request(app).get("/api/assignments").query({ studentId: "noa" }).expect(200);
    const missing = await request(app).get("/api/assignments").query({ studentId: "other" }).expect(200);

    expect(matching.body).toHaveLength(1);
    expect(matching.body.every((assignment: { studentId: string }) => assignment.studentId === "noa")).toBe(true);
    expect(missing.body).toEqual([]);
  });

  it.each(["studentId=", "studentId=noa&studentId=other"])(
    "rejects malformed student filters without returning assignments: %s",
    async (query) => {
      const list = vi.spyOn(service, "list");
      const response = await request(app).get(`/api/assignments?${query}`).expect(400);

      expect(response.body.fieldErrors.studentId).toBeDefined();
      expect(list).not.toHaveBeenCalled();
    },
  );

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

  // The demo API has no authentication/authorization or persisted assignment ownership yet.
  it.todo("rejects unauthenticated assignment reads and updates once authentication exists");
  it.todo("rejects assignment reads and completion for another student once authorization exists");
  it.todo("enforces parent, student, teacher and admin assignment permissions once roles exist");
});
