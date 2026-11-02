import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const productionOrigin = "https://education-8mju.vercel.app";
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/education_test";
delete process.env.CORS_ORIGIN;

const { default: app } = await import("../api/index.mjs");
const server = createServer(app);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("the deployed entry point serves health JSON with production CORS", async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: productionOrigin } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(response.headers.get("access-control-allow-origin"), productionOrigin);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("a representative frontend API request reaches the existing assignments route", async () => {
  const response = await fetch(`${baseUrl}/api/assignments?studentId=noa`);
  assert.equal(response.status, 200);
  const assignments = await response.json();
  assert(assignments.length > 0);
  assert(assignments.every((assignment) => assignment.studentId === "noa"));
});

test("CORS preflight allows JSON writes from the deployed origin", async () => {
  const response = await fetch(`${baseUrl}/api/assignments/a1/complete`, {
    method: "OPTIONS",
    headers: {
      Origin: productionOrigin,
      "Access-Control-Request-Method": "PATCH",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), productionOrigin);
  assert.match(response.headers.get("access-control-allow-methods"), /PATCH/);
  assert.equal(response.headers.get("access-control-allow-headers"), "content-type");
});

test("API roots and missing routes return JSON errors instead of the SPA", async () => {
  for (const path of ["/api", "/api/", "/api/missing?query=value"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.deepEqual(await response.json(), { message: "API route not found" });
  }
});

test("CORS defaults preserve local development and permit explicit overrides", () => {
  for (const [mode, override, expected] of [
    ["production", undefined, productionOrigin],
    ["development", undefined, "http://localhost:5173"],
    ["production", "https://preview.example.com", "https://preview.example.com"],
  ]) {
    const result = spawnSync(process.execPath, [
      "--input-type=module", "-e",
      'const { env } = await import("./backend/dist/config/env.js"); process.stdout.write(env.CORS_ORIGIN);',
    ], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: { ...process.env, NODE_ENV: mode, CORS_ORIGIN: override },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, expected);
  }
});
