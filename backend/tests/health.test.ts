import assert from "node:assert/strict";
import { test } from "node:test";
import { setupTestApi } from "./api.js";

const requestJson = setupTestApi();

test("GET /api/health reports a healthy API", async () => {
  assert.deepEqual(await requestJson("/api/health", 200), { status: "ok" });
});
