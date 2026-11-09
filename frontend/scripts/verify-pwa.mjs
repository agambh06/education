import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { verifyManifest, verifyPng } from "./pwa-manifest.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("dist/manifest.webmanifest"));

verifyManifest(manifest);

for (const icon of manifest.icons) {
  const png = readFileSync(new URL(`../dist/${icon.src}`, import.meta.url));
  verifyPng(png, icon.sizes, icon.src);
}

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

const vercel = JSON.parse(read("../vercel.json"));
assert.deepEqual(vercel.rewrites[0], { source: "/api/:path*", destination: "/api" });
const spaRewrite = new RegExp(`^${vercel.rewrites.find((rule) => rule.destination === "/index.html").source}$`);
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
