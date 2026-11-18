import assert from "node:assert/strict";

export function verifyManifest(manifest) {
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
  assert(Array.isArray(manifest.icons), "Manifest must declare icons");
  assert(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/png", icon.src);
    assert.equal(typeof icon.src, "string", "Icon must have a URL");
  }
}

export function verifyPng(png, sizes, label) {
  assert(png.length >= 24, `${label}: truncated PNG`);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", label);
  assert.equal(png.subarray(12, 16).toString(), "IHDR", label);
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, sizes, label);
}
