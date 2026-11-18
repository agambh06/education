import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyManifest, verifyPng } from "./pwa-manifest.mjs";

// HTTP smoke checks only: installation, worker activation, and update UX need a browser.
export async function verifyProduction(url, fetchResource = fetch) {
  const origin = new URL(url);
  assert.equal(origin.protocol, "https:", "Production verification requires HTTPS");
  assert.equal(origin.pathname, "/", "Use the stable production origin, without a path");
  assert(!origin.search && !origin.hash && !origin.username && !origin.password, "Use a plain production origin");
  const checked = [];
  const request = async (path, { allowError = false } = {}) => {
    const target = new URL(path, origin);
    assert.equal(target.origin, origin.origin, `Expected a same-origin resource: ${path}`);
    const response = await fetchResource(target, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    assert.equal(new URL(response.url).origin, origin.origin, `${path}: redirected to another origin`);
    assert(allowError || response.ok, `${path}: HTTP ${response.status}`);
    checked.push(`${path}: HTTP ${response.status}`);
    return response;
  };
  const text = async (path, type) => {
    const response = await request(path);
    assert.match(response.headers.get("content-type") ?? "", type, `${path}: unexpected content type`);
    const body = await response.text();
    assert(body.length > 0, `${path}: empty response`);
    return { response, body };
  };

  const { body: html } = await text("/", /text\/html/i);
  assert.match(html, /<html\b[^>]*lang="he"[^>]*dir="rtl"/i, "Hebrew RTL document");
  assert.match(html, /<link\b[^>]*rel="manifest"[^>]*href="\/manifest\.webmanifest"/i, "Manifest link");
  assert.match(html, /<meta\b[^>]*name="apple-mobile-web-app-capable"[^>]*content="yes"/i);
  assert.match(html, /<meta\b[^>]*name="apple-mobile-web-app-title"[^>]*content="סקולי"/i);
  assert.match(html, /<link\b[^>]*rel="apple-touch-icon"[^>]*href="\/apple-touch-icon-180x180\.png"/i);

  const { body: manifestBody } = await text("/manifest.webmanifest", /application\/manifest\+json/i);
  const manifest = JSON.parse(manifestBody);
  verifyManifest(manifest);
  for (const icon of [...manifest.icons, { src: "/apple-touch-icon-180x180.png", sizes: "180x180" }]) {
    const response = await request(new URL(icon.src, new URL("/manifest.webmanifest", origin)).href);
    assert.match(response.headers.get("content-type") ?? "", /image\/png/i, icon.src);
    verifyPng(Buffer.from(await response.arrayBuffer()), icon.sizes, icon.src);
  }

  const { response: worker, body: workerBody } = await text("/sw.js", /(?:application|text)\/javascript/i);
  const cacheControl = worker.headers.get("cache-control") ?? "";
  assert.match(cacheControl, /(?:^|,)\s*max-age=0(?:,|$)/i, "sw.js must revalidate");
  assert.match(cacheControl, /(?:^|,)\s*must-revalidate(?:,|$)/i, "sw.js must revalidate");
  assert.doesNotMatch(cacheControl, /immutable/i, "sw.js must not be immutable");
  assert.match(workerBody, /SKIP_WAITING/, "Expected the prompt worker's activation message");
  // Fetch the worker's generated Workbox runtime too; a missing import prevents registration.
  const runtimes = [...workerBody.matchAll(/["']([^"']*workbox-[\w.-]+)["']/g)];
  assert(runtimes.length > 0, "Expected the generated Workbox runtime");
  for (const [, runtime] of runtimes) {
    await text(runtime.endsWith(".js") ? runtime : `${runtime}.js`, /(?:application|text)\/javascript/i);
  }

  const { body: navigation } = await text("/assignments", /text\/html/i);
  assert.equal(navigation, html, "Deep links must return the application shell");
  for (const path of ["/api", "/api/health", "/assets/pwa-verification-missing.js"]) {
    const response = await request(path, { allowError: true });
    const body = await response.text();
    assert(body !== html && !/<div\b[^>]*id=["']root["']/i.test(body), `${path}: must not return the SPA shell`);
    assert(response.status < 500, `${path}: server error ${response.status}`);
  }
  return checked;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert(process.argv[2], "Usage: npm run verify:pwa:production -- https://your-production-domain");
    const checked = await verifyProduction(process.argv[2]);
    console.log(checked.join("\n"));
    console.log(
      "Production PWA HTTP checks passed. Browser installation, registration, and deployment update checks remain separate.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
