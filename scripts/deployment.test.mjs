import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const productionOrigin = "https://education-8mju.vercel.app";
process.env.NODE_ENV = "production";
delete process.env.DATABASE_URL;
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

test("an unauthenticated frontend API request is denied by the assignments route", async () => {
  const response = await fetch(`${baseUrl}/api/assignments?studentId=noa`);
  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await response.json(), { message: "Authentication required" });
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

test("an explicitly configured invalid database URL still fails validation", () => {
  const result = spawnSync(process.execPath, [
    "--input-type=module", "-e", 'await import("./backend/dist/config/env.js");',
  ], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "invalid-url" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DATABASE_URL/);
});

async function isolatedBackendBuild(generatorFails = false) {
  const fixture = await mkdtemp(join(tmpdir(), "education-backend-build-"));
  try {
    const { scripts } = JSON.parse(await readFile(new URL("../backend/package.json", import.meta.url), "utf8"));
    await writeFile(join(fixture, "package.json"), JSON.stringify({ name: "isolated-backend-build", private: true, scripts }));
    const bin = join(fixture, "node_modules", ".bin");
    await mkdir(bin, { recursive: true });
    const eventsFile = join(fixture, "build-events.txt");
    const generatedClient = join(fixture, "generated-client.txt");

    // The fixture starts without a generated client, as with an install that
    // skips lifecycle hooks. These executables exercise the real npm scripts
    // without generating files inside the checkout or connecting to a database.
    const commands = {
      prisma: `
const { appendFileSync, writeFileSync } = require("node:fs");
if (process.argv.slice(2).join(" ") !== "generate") process.exit(2);
appendFileSync(process.env.BUILD_EVENTS_FILE, "generate\\n");
if (process.env.FAIL_PRISMA_GENERATION === "1") process.exit(7);
writeFileSync(process.env.GENERATED_CLIENT_FILE, "generated");
`,
      tsc: `
const { appendFileSync, existsSync } = require("node:fs");
appendFileSync(process.env.BUILD_EVENTS_FILE, "compile\\n");
if (!existsSync(process.env.GENERATED_CLIENT_FILE)) {
  process.stderr.write("Prisma Client must be generated before compilation");
  process.exit(8);
}
`,
    };
    for (const [name, source] of Object.entries(commands)) {
      const executable = join(bin, name);
      await writeFile(executable, `#!/usr/bin/env node\n${source}`, { mode: 0o755 });
      if (process.platform === "win32") {
        await writeFile(`${executable}.cmd`, `@echo off\r\n"${process.execPath}" "${executable}" %*\r\n`);
      }
    }
    const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
    const result = spawnSync("npm run build --ignore-scripts", {
      cwd: fixture,
      shell: true,
      encoding: "utf8",
      timeout: 30_000,
      env: {
        ...process.env,
        [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ""}`,
        npm_config_ignore_scripts: "true",
        BUILD_EVENTS_FILE: eventsFile,
        GENERATED_CLIENT_FILE: generatedClient,
        FAIL_PRISMA_GENERATION: generatorFails ? "1" : "0",
      },
    });
    const events = await readFile(eventsFile, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    return { ...result, events: events.trim().split("\n").filter(Boolean) };
  } finally {
    assert.equal(dirname(fixture), resolve(tmpdir()));
    await rm(fixture, { recursive: true, force: true });
  }
}

test("backend build generates Prisma Client before compilation when install hooks are skipped", async () => {
  const result = await isolatedBackendBuild();
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(result.events, ["generate", "compile"]);
});

test("backend build stops before compilation if Prisma Client generation fails", async () => {
  const result = await isolatedBackendBuild(true);
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(result.events, ["generate"]);
});
