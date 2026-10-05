import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("dist/manifest.webmanifest"));

for (const [key, value] of Object.entries({
  name: "סקולי | ניהול בית ספר",
  short_name: "סקולי",
  lang: "he",
  dir: "rtl",
  display: "standalone",
  start_url: "/",
  scope: "/",
})) {
  assert.equal(manifest[key], value, key);
}

for (const icon of manifest.icons) {
  const png = readFileSync(new URL(`../dist/${icon.src}`, import.meta.url));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", icon.src);
  assert.equal(icon.type, "image/png");
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes, icon.src);
}
assert(manifest.icons.some((icon) => icon.sizes === "192x192"));
assert(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
assert(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));

// Execute the generated worker configuration with Workbox boundaries captured.
// This checks build output, including activation and fallback behavior.
const routes = [];
let precache = [];
let skipWaitingCalls = 0;
let claimed = false;
let messageHandler;
const workbox = {
  clientsClaim() {
    claimed = true;
  },
  precacheAndRoute(entries) {
    precache = entries;
  },
  cleanupOutdatedCaches() {},
  createHandlerBoundToURL(url) {
    assert.equal(url, "/index.html");
    return url;
  },
  NavigationRoute: class {
    constructor(handler, options) {
      this.handler = handler;
      this.denylist = options.denylist;
    }
  },
  registerRoute(route) {
    routes.push(route);
  },
};
const define = (_dependencies, factory) => factory(workbox);
runInNewContext(read("dist/sw.js"), {
  define,
  self: {
    define,
    addEventListener(type, handler) {
      assert.equal(type, "message");
      messageHandler = handler;
    },
    skipWaiting() {
      skipWaitingCalls += 1;
    },
  },
});
assert(claimed);
assert.equal(skipWaitingCalls, 0, "An update must wait for the user before activating");
messageHandler({ data: { type: "SKIP_WAITING" } });
assert.equal(skipWaitingCalls, 1);
assert.equal(routes.length, 1, "Only the navigation fallback should be registered");

for (const asset of ["index.html", "manifest.webmanifest", ...manifest.icons.map((icon) => icon.src)]) {
  assert(
    precache.some((entry) => entry.url === asset),
    `Missing precached ${asset}`,
  );
}
assert(precache.some((entry) => entry.url.endsWith(".js")));
assert(precache.some((entry) => entry.url.endsWith(".css")));
assert(!precache.some((entry) => /^\/?api(?:\/|\?|$)/.test(entry.url)));

const vercel = JSON.parse(read("vercel.json"));
const spaRewrite = new RegExp(`^${vercel.rewrites[0].source}$`);
for (const path of ["/", "/assignments", "/parents/42", "/apiary"]) {
  assert(spaRewrite.test(path), `Vercel must serve the shell for ${path}`);
  assert(!routes[0].denylist.some((pattern) => pattern.test(path)), path);
}
for (const path of ["/api", "/api/", "/api/health", "/assets/missing.js", "/sw.js", "/manifest.webmanifest"]) {
  assert(!spaRewrite.test(path), `Vercel must bypass the shell for ${path}`);
  assert(
    routes[0].denylist.some((pattern) => pattern.test(path)),
    path,
  );
}
assert(routes[0].denylist.some((pattern) => pattern.test("/api?query=value")));
assert(
  vercel.headers.some(
    (rule) =>
      rule.source === "/sw.js" &&
      rule.headers.some((header) => header.key === "Cache-Control" && header.value.includes("must-revalidate")),
  ),
);

assert(read("dist/index.html").includes('rel="manifest"'));
assert(!read("dist/index.html").includes("registerSW.js"), "React owns registration");
assert(!existsSync(new URL("../dist/registerSW.js", import.meta.url)));
console.log("PWA output verified: manifest, icons, precache, update activation, API exclusions, and Vercel rules.");
