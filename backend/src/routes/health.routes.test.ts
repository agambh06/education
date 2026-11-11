import request from "supertest";
import { describe, it } from "vitest";
import { app } from "../app.js";

describe("health API", () => {
  it("reports API health as JSON without a database connection", async () => {
    await request(app).get("/api/health").expect("Content-Type", /json/).expect(200, { status: "ok" });
  });
});
