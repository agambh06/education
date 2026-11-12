import request from "supertest";
import { describe, it } from "vitest";
import { app } from "../app.js";

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
});
