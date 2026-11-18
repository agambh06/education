import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  createUser: vi.fn(),
  createSession: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../db.js", () => ({
  prisma: {
    user: { findUnique: authMocks.findUser },
    $transaction: authMocks.transaction,
  },
}));

describe("account registration API", () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    authMocks.findUser.mockResolvedValue(null);
    authMocks.createUser.mockResolvedValue({
      id: "user-1",
      email: "parent@example.com",
      firstName: "Dana",
      lastName: "Levi",
      role: "PARENT",
    });
    authMocks.createSession.mockResolvedValue({ id: "session-1" });
    authMocks.transaction.mockImplementation(async (runTransaction) =>
      runTransaction({
        user: { create: authMocks.createUser },
        session: { create: authMocks.createSession },
      }),
    );

    vi.resetModules();
    const { createApp } = await import("../../app.js");
    app = createApp({ resolveAuthenticatedUser: async () => null });
  });

  it("creates the account and session together and returns a secure session cookie", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: " PARENT@Example.com ",
        password: "correct horse battery staple",
        firstName: "Dana",
        lastName: "Levi",
      })
      .expect(201);

    expect(response.body).toEqual({
      user: { id: "user-1", email: "parent@example.com", firstName: "Dana", lastName: "Levi", role: "PARENT" },
    });
    expect(response.headers["set-cookie"][0]).toMatch(/education_session=.*; HttpOnly; SameSite=Lax/);
    expect(authMocks.transaction).toHaveBeenCalledOnce();
    expect(authMocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "parent@example.com", role: "PARENT" }),
        select: expect.objectContaining({ id: true, email: true }),
      }),
    );
    expect(authMocks.createSession).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    });
  });

  it("rejects invalid input before accessing the database", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "invalid", password: "short", firstName: "", lastName: "" })
      .expect(400, { message: "Enter a valid email, name, and password with at least 8 characters." });

    expect(authMocks.findUser).not.toHaveBeenCalled();
    expect(authMocks.transaction).not.toHaveBeenCalled();
  });

  it("returns a conflict when the email already exists", async () => {
    authMocks.findUser.mockResolvedValue({ id: "existing-user" });

    await request(app)
      .post("/api/auth/register")
      .send({
        email: "parent@example.com",
        password: "correct horse battery staple",
        firstName: "Dana",
        lastName: "Levi",
      })
      .expect(409, { message: "An account with this email already exists." });

    expect(authMocks.transaction).not.toHaveBeenCalled();
  });

  it("maps only a unique email race to a conflict", async () => {
    authMocks.transaction.mockRejectedValue({ code: "P2002" });

    await request(app)
      .post("/api/auth/register")
      .send({
        email: "parent@example.com",
        password: "correct horse battery staple",
        firstName: "Dana",
        lastName: "Levi",
      })
      .expect(409, { message: "An account with this email already exists." });
  });

  it("returns a generic server error for database failures instead of reporting a duplicate", async () => {
    authMocks.findUser.mockRejectedValue(new Error("database unavailable"));

    await request(app)
      .post("/api/auth/register")
      .send({
        email: "parent@example.com",
        password: "correct horse battery staple",
        firstName: "Dana",
        lastName: "Levi",
      })
      .expect(500, { message: "Internal server error" });
  });

  it("rolls back account creation if the session cannot be created", async () => {
    authMocks.createSession.mockRejectedValue(new Error("session table missing"));

    await request(app)
      .post("/api/auth/register")
      .send({
        email: "parent@example.com",
        password: "correct horse battery staple",
        firstName: "Dana",
        lastName: "Levi",
      })
      .expect(500, { message: "Internal server error" });

    expect(authMocks.transaction).toHaveBeenCalledOnce();
  });
});
