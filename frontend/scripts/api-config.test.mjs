import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "vite";

// Build the real config module so the checks include Vite's environment substitution.
async function loadConfig(apiUrl, development = false) {
  const result = await build({
    configFile: false,
    envFile: false,
    root: fileURLToPath(new URL("../", import.meta.url)),
    logLevel: "silent",
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl) ?? "undefined",
      "import.meta.env.DEV": JSON.stringify(development),
    },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL("../src/config.ts", import.meta.url)),
        formats: ["es"],
      },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  const code = output.find((item) => item.type === "chunk").code;
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).appConfig;
}

test("production uses the same origin API when no URL is configured", async () => {
  for (const value of [undefined, "", "   "]) {
    assert.equal((await loadConfig(value)).apiUrl, "/api");
  }
});

test("local development retains its separate backend port", async () => {
  assert.equal((await loadConfig(undefined, true)).apiUrl, "http://localhost:4000/api");
});

test("explicit API URLs are normalized and preserve the API route prefix", async () => {
  for (const [value, expected] of [
    [" https://backend.example.com/api/ ", "https://backend.example.com/api"],
    ["/api/", "/api"],
  ]) {
    assert.equal((await loadConfig(value)).apiUrl, expected);
  }
});
