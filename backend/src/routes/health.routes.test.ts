import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { createHealthRouter } from "./health.routes.js";

describe("health API", () => {
  it("reports API health as JSON without a database connection", async () => {
    await request(app).get("/api/health").expect("Content-Type", /json/).expect(200, { status: "ok" });
  });

  it("returns the upstream JSON 404 response for unknown API routes", async () => {
    await request(app)
      .get("/api/missing")
      .expect("Content-Type", /json/)
      .expect(404, { message: "API route not found" });
  });

  it("reports readiness only after a successful database probe and disables caching", async () => {
    const probe = vi.fn().mockResolvedValue(undefined);
    const readyApp = express().use("/api/health", createHealthRouter(probe));
    await request(readyApp).get("/api/health/ready").expect("Cache-Control", "no-store").expect(200, { status: "ok" });
    expect(probe).toHaveBeenCalledOnce();
  });

  it("returns a safe 503 for connection or schema errors without changing liveness", async () => {
    const probe = vi.fn().mockRejectedValue(new Error("postgresql://private:secret@private-host/database"));
    const readyApp = express().use("/api/health", createHealthRouter(probe));
    await request(readyApp)
      .get("/api/health/ready")
      .expect("Cache-Control", "no-store")
      .expect(503, { status: "unavailable" });
    await request(readyApp).get("/api/health").expect(200, { status: "ok" });
    expect(probe).toHaveBeenCalledOnce();
  });
});
