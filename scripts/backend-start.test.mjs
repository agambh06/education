import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const backendDirectory = fileURLToPath(new URL("../backend/", import.meta.url));

test("npm start serves the compiled backend using hosting environment variables", { timeout: 60_000 }, async () => {
  // Reserve an available port instead of depending on a developer's port 4000.
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));

  assert.ok(process.env.npm_execpath, "Run this test through npm run test:backend-deployment");
  const child = spawn(process.execPath, [process.env.npm_execpath, "start"], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      CORS_ORIGIN: "https://frontend.example.com",
      DATABASE_URL: undefined,
      DOTENV_CONFIG_PATH: fileURLToPath(new URL("../backend/.env.production.example", import.meta.url)),
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    windowsHide: true,
  });
  let output = "";
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Backend did not start:\n${output}`)), 45_000);
      child.on("error", reject);
      child.on("exit", (code) => reject(new Error(`Backend exited with ${code}:\n${output}`)));
      child.stdout.on("data", (data) => {
        output += data;
        if (output.includes(`API listening at http://localhost:${port}`)) resolve();
      });
      child.stderr.on("data", (data) => { output += data; });
    });
    clearTimeout(timer);

    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      headers: { Origin: "https://frontend.example.com" },
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://frontend.example.com");
    assert.deepEqual(await response.json(), { status: "ok" });
  } finally {
    clearTimeout(timer);
    // npm starts a shell and a server. Stop the whole tree so no listener leaks.
    if (child.pid && child.exitCode === null) {
      const exited = once(child, "exit", { signal: AbortSignal.timeout(5_000) });
      if (process.platform === "win32") {
        // A shell can exit while taskkill walks the tree, causing a nonzero
        // result even when cleanup succeeds. Verify termination below instead.
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else {
        process.kill(-child.pid, "SIGTERM");
      }
      await exited;
      await assert.rejects(fetch(`http://127.0.0.1:${port}/api/health`, {
        headers: { Connection: "close" },
        signal: AbortSignal.timeout(2_000),
      }));
    }
  }
});
