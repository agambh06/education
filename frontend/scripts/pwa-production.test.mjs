import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { verifyProduction } from "./verify-pwa-production.mjs";

const origin = "https://school.example";
const html =
  '<html lang="he" dir="rtl"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="סקולי"><div id="root"></div></html>';

function fixture() {
  const manifest = {
    name: "סקולי | ניהול בית ספר",
    short_name: "סקולי",
    lang: "he",
    dir: "rtl",
    display: "standalone",
    start_url: "/",
    scope: "/",
    icons: [
      { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  const resource = (body, type, status = 200, headers = {}) => ({
    body,
    status,
    headers: { "content-type": type, ...headers },
  });
  const resources = new Map([
    ["/manifest.webmanifest", resource(() => JSON.stringify(manifest), "application/manifest+json")],
    ["/", resource(html, "text/html")],
    ["/assignments", resource(html, "text/html")],
    [
      "/sw.js",
      resource('define(["./workbox-123abc"],function(){/* SKIP_WAITING */})', "application/javascript", 200, {
        "cache-control": "public, max-age=0, must-revalidate",
      }),
    ],
    ["/workbox-123abc.js", resource("/* runtime */", "application/javascript")],
    ["/api", resource("Not found", "text/plain", 404)],
    ["/api/health", resource("Not found", "text/plain", 404)],
    ["/assets/pwa-verification-missing.js", resource("Not found", "text/plain", 404)],
  ]);
  for (const path of [...manifest.icons.map((icon) => icon.src), "apple-touch-icon-180x180.png"]) {
    resources.set(`/${path}`, resource(readFileSync(new URL(`../public/${path}`, import.meta.url)), "image/png"));
  }
  const requests = [];
  const fetchResource = async (url, options) => {
    assert.equal(options.cache, "no-store");
    assert(options.signal instanceof AbortSignal);
    requests.push(url.pathname);
    const entry = resources.get(url.pathname);
    assert(entry, `Unexpected request: ${url.pathname}`);
    const body = typeof entry.body === "function" ? entry.body() : entry.body;
    const response = new Response(body, { status: entry.status, headers: entry.headers });
    Object.defineProperty(response, "url", { value: entry.url ?? url.href });
    return response;
  };
  return { manifest, resources, requests, fetchResource };
}

test("production smoke checks fetch the shell, manifest, icons, worker, runtime, and routing exclusions", async () => {
  const app = fixture();
  const checks = await verifyProduction(origin, app.fetchResource);
  assert.equal(checks.length, 12);
  assert(app.requests.includes("/workbox-123abc.js"));
  assert(app.requests.includes("/apple-touch-icon-180x180.png"));
});

test("plain HTTP and non-origin URLs fail before making requests", async () => {
  for (const url of ["http://school.example", `${origin}/assignments`, `${origin}/?token=example`]) {
    const app = fixture();
    await assert.rejects(verifyProduction(url, app.fetchResource));
    assert.equal(app.requests.length, 0);
  }
});

test("wrong Hebrew identity, display mode, or missing install icons fail", async () => {
  for (const change of [{ name: "Wrong app" }, { display: "browser" }, { icons: [] }]) {
    const app = fixture();
    Object.assign(app.manifest, change);
    await assert.rejects(verifyProduction(origin, app.fetchResource));
  }
});

test("an icon replaced by HTML fails even with image/png headers", async () => {
  const app = fixture();
  app.resources.get("/pwa-192x192.png").body = html;
  await assert.rejects(verifyProduction(origin, app.fetchResource), /pwa-192x192/);
});

test("wrong icon dimensions fail", async () => {
  const app = fixture();
  const png = Buffer.from(app.resources.get("/pwa-192x192.png").body);
  png.writeUInt32BE(512, 16);
  app.resources.get("/pwa-192x192.png").body = png;
  await assert.rejects(verifyProduction(origin, app.fetchResource));
});

test("stale worker caching and HTML rewrites fail", async () => {
  for (const change of [
    { "cache-control": "public, max-age=3600" },
    { "cache-control": "public, max-age=0, must-revalidate, immutable" },
    { "content-type": "text/html" },
  ]) {
    const app = fixture();
    Object.assign(app.resources.get("/sw.js").headers, change);
    await assert.rejects(verifyProduction(origin, app.fetchResource));
  }
});

test("a missing Workbox import fails", async () => {
  const app = fixture();
  app.resources.get("/workbox-123abc.js").status = 404;
  await assert.rejects(verifyProduction(origin, app.fetchResource), /workbox-123abc.js: HTTP 404/);
});

test("a worker without the prompt activation message fails", async () => {
  const app = fixture();
  app.resources.get("/sw.js").body = 'define(["./workbox-123abc"],function(){})';
  await assert.rejects(verifyProduction(origin, app.fetchResource), /activation message/);
});

test("API and missing asset paths must not return the SPA", async () => {
  for (const path of ["/api", "/api/health", "/assets/pwa-verification-missing.js"]) {
    const app = fixture();
    Object.assign(app.resources.get(path), { body: html, status: 200 });
    await assert.rejects(verifyProduction(origin, app.fetchResource), /must not return the SPA/);
  }
});

test("a deployment login redirect fails instead of reporting a pass", async () => {
  const app = fixture();
  app.resources.get("/").url = "https://vercel.com/login";
  await assert.rejects(verifyProduction(origin, app.fetchResource), /redirected to another origin/);
});

test("an off-origin manifest icon fails before fetching it", async () => {
  const app = fixture();
  app.manifest.icons[0].src = "https://other.example/icon.png";
  await assert.rejects(verifyProduction(origin, app.fetchResource), /same-origin resource/);
  assert.equal(app.requests.length, 2);
});

test("unavailable or protected installation resources fail", async () => {
  for (const path of ["/", "/manifest.webmanifest", "/pwa-192x192.png", "/apple-touch-icon-180x180.png", "/sw.js"]) {
    for (const status of [401, 404]) {
      const app = fixture();
      app.resources.get(path).status = status;
      await assert.rejects(
        verifyProduction(origin, app.fetchResource),
        (error) => error instanceof Error && error.message.endsWith(`${path}: HTTP ${status}`),
      );
    }
  }
});

test("malformed manifest JSON fails", async () => {
  const app = fixture();
  app.resources.get("/manifest.webmanifest").body = "{invalid JSON";
  await assert.rejects(verifyProduction(origin, app.fetchResource), SyntaxError);
});

test("a manifest served as HTML fails before parsing its body", async () => {
  const app = fixture();
  app.resources.get("/manifest.webmanifest").headers["content-type"] = "text/html";
  await assert.rejects(verifyProduction(origin, app.fetchResource), /manifest.webmanifest: unexpected content type/);
});

test("missing Apple installation metadata fails", async () => {
  for (const attribute of ["apple-mobile-web-app-capable", "apple-mobile-web-app-title", "apple-touch-icon"]) {
    const app = fixture();
    app.resources.get("/").body = html.replaceAll(attribute, "missing-metadata");
    await assert.rejects(verifyProduction(origin, app.fetchResource));
  }
});

test("an empty service worker fails even with successful HTTP and correct headers", async () => {
  const app = fixture();
  app.resources.get("/sw.js").body = "";
  await assert.rejects(verifyProduction(origin, app.fetchResource), /sw.js: empty response/);
});

test("a network failure rejects the production check", async () => {
  const app = fixture();
  const networkError = new Error("Connection lost while fetching the service worker");
  const fetchResource = (url, options) => {
    if (url.pathname === "/sw.js") return Promise.reject(networkError);
    return app.fetchResource(url, options);
  };
  await assert.rejects(verifyProduction(origin, fetchResource), (error) => error === networkError);
  assert(!app.requests.includes("/assignments"), "Verification must stop after the failed request");
});

test("server errors on routing exclusion paths do not count as a pass", async () => {
  for (const path of ["/api", "/api/health", "/assets/pwa-verification-missing.js"]) {
    const app = fixture();
    app.resources.get(path).status = 503;
    await assert.rejects(verifyProduction(origin, app.fetchResource), /server error 503/);
  }
});

test("deep links must return the same application shell", async () => {
  const app = fixture();
  app.resources.get("/assignments").body = "<html>Another application</html>";
  await assert.rejects(verifyProduction(origin, app.fetchResource), /Deep links must return the application shell/);
});

test("a configured API can return JSON without failing the routing checks", async () => {
  const app = fixture();
  for (const path of ["/api", "/api/health"]) {
    Object.assign(app.resources.get(path), {
      status: 200,
      body: JSON.stringify({ status: "ok" }),
      headers: { "content-type": "application/json" },
    });
  }
  const checks = await verifyProduction(origin, app.fetchResource);
  assert(checks.includes("/api: HTTP 200"));
  assert(checks.includes("/api/health: HTTP 200"));
});
