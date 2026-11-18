import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({ student: { findMany: vi.fn() } }));
vi.mock("../../db.js", () => ({ prisma: prismaMock }));

describe("school structure routes", () => {
  let app: Express;

  beforeEach(async () => {
    vi.resetModules();
    prismaMock.student.findMany.mockReset().mockResolvedValue([
      { id: "student-1", firstName: "Noa", lastName: "Cohen", classId: "class-1" },
    ]);
    const { createApp } = await import("../../app.js");
    app = createApp({
      resolveAuthenticatedUser: async () => ({ userId: "student-user", role: "STUDENT", studentId: "student-1" }),
    });
  });

  it("authenticates school structure reads and returns the requester's scoped data", async () => {
    await request(app)
      .get("/api/students")
      .expect("Cache-Control", "private, no-store")
      .expect(200, [{ id: "student-1", firstName: "Noa", lastName: "Cohen", classId: "class-1" }]);

    expect(prismaMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["student-1"] } } }),
    );
  });

  it("rejects unauthenticated school structure reads", async () => {
    const { createApp } = await import("../../app.js");
    const unauthenticatedApp = createApp({ resolveAuthenticatedUser: async () => null });

    await request(unauthenticatedApp).get("/api/students").expect(401, { message: "Authentication required" });
    expect(prismaMock.student.findMany).not.toHaveBeenCalled();
  });

  it("keeps unknown API paths as 404 responses without running school structure auth", async () => {
    const resolveAuthenticatedUser = vi.fn(async () => null);
    const { createApp } = await import("../../app.js");
    const appWithoutUser = createApp({ resolveAuthenticatedUser });

    await request(appWithoutUser).get("/api/missing").expect(404, { message: "API route not found" });
    expect(resolveAuthenticatedUser).not.toHaveBeenCalled();
  });
});
