import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  requestLink: vi.fn(),
  list: vi.fn(),
  approve: vi.fn(),
  revoke: vi.fn(),
  requireAccess: vi.fn(),
}));

vi.mock("./parent-links.service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./parent-links.service.js")>()),
  createParentLinksService: () => service,
}));

import { createApp } from "../../app.js";
import { ParentLinkError } from "./parent-links.service.js";

// No connection is opened: service calls are mocked at the HTTP boundary.
const prisma = new PrismaClient();
const authenticated = () => createApp({ prisma, resolveUserId: async () => "server-session-user" });

describe("parent link HTTP trust boundary", () => {
  it("rejects all operations by default, even with forged identity headers and payloads", async () => {
    const app = createApp();
    for (const [method, path] of [
      ["get", "/"],
      ["post", "/invitations"],
      ["post", "/requests"],
      ["post", "/link/approve"],
      ["delete", "/link"],
    ] as const) {
      const response = await request(app)
        [method](`/api/parent-links${path}`)
        .set("Authorization", "Bearer forged")
        .set("X-User-Id", "student")
        .set("X-Role", "ADMIN")
        .send({ userId: "student", studentId: "victim", role: "STUDENT", consent: true });
      expect(response.status).toBe(401);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.body).toEqual({ message: "Authentication required" });
    }
  });

  it("rejects a missing authenticated session even when a database adapter is configured", async () => {
    await request(createApp({ prisma, resolveUserId: async () => null }))
      .get("/api/parent-links")
      .expect(401);
  });

  it("uses only the server-resolved actor and keeps invitation secrets out of caches", async () => {
    service.createInvitation.mockResolvedValue({ token: "secret", expiresAt: new Date("2026-12-01") });
    const response = await request(authenticated()).post("/api/parent-links/invitations").send({}).expect(201);
    expect(service.createInvitation).toHaveBeenLastCalledWith("server-session-user");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it.each([
    { studentId: "arbitrary-id" },
    { email: "student@example.test" },
    { token: "x".repeat(43), parentId: "forged" },
    { token: "x".repeat(43), guardianVerified: true },
    { token: "invalid" },
  ])("rejects arbitrary identity claims and forged request fields: %j", async (body) => {
    await request(authenticated()).post("/api/parent-links/requests").send(body).expect(400);
  });

  it("does not accept age/guardian assertions when creating an invitation", async () => {
    await request(authenticated())
      .post("/api/parent-links/invitations")
      .send({ eligible: true, age: 21, guardianVerified: true })
      .expect(400);
  });

  it("redeems a token with the authenticated parent ID", async () => {
    service.requestLink.mockResolvedValue({ id: "pending", status: "PENDING" });
    const token = "a".repeat(43);
    await request(authenticated()).post("/api/parent-links/requests").send({ token }).expect(201);
    expect(service.requestLink).toHaveBeenLastCalledWith("server-session-user", token);
  });

  it.each([{}, { consent: false }, { consent: true, guardianVerified: true }])(
    "requires explicit consent and rejects forged verification fields: %j",
    async (body) => {
      await request(authenticated()).post("/api/parent-links/link/approve").send(body).expect(400);
    },
  );

  it("approves and revokes only as the authenticated actor", async () => {
    service.approve.mockResolvedValue({ id: "link", status: "VERIFIED" });
    service.revoke.mockResolvedValue({ id: "link", status: "REVOKED" });
    await request(authenticated()).post("/api/parent-links/link/approve").send({ consent: true }).expect(200);
    expect(service.approve).toHaveBeenLastCalledWith("server-session-user", "link", true);
    await request(authenticated()).delete("/api/parent-links/link").expect(200);
    expect(service.revoke).toHaveBeenLastCalledWith("server-session-user", "link");
  });

  it("maps domain errors without exposing unexpected database errors", async () => {
    service.list.mockRejectedValueOnce(new ParentLinkError(403, "Student access denied"));
    await request(authenticated()).get("/api/parent-links").expect(403, { message: "Student access denied" });
    service.list.mockRejectedValueOnce(new Error("private database connection details"));
    await request(authenticated()).get("/api/parent-links").expect(500, { message: "Internal server error" });
  });
});
