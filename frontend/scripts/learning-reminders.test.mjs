import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function compile(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
}

const apiClientCode = compile("../src/services/apiClient.ts");
const remindersServiceCode = compile("../src/services/learningRemindersService.ts");

// Execute both real modules with only the API origin and network boundary controlled.
function loadService(fetch) {
  const apiClient = {};
  runInNewContext(apiClientCode, {
    exports: apiClient,
    fetch,
    require(name) {
      assert.equal(name, "../config");
      return { appConfig: { apiUrl: "/api" } };
    },
  });
  const service = {};
  runInNewContext(remindersServiceCode, {
    exports: service,
    require(name) {
      assert.equal(name, "./apiClient");
      return apiClient;
    },
  });
  return service.learningRemindersService;
}

function disabledStatus() {
  return {
    settingsAvailable: false,
    deliveryEnabled: false,
    blockedBy: ["AUTHENTICATION", "VERIFIED_LINKS", "PERMITTED_PROGRESS", "PRIVACY_REVIEW"],
    defaults: { upcomingExams: false, lowActivity: false, timeZone: "Asia/Jerusalem" },
    policy: { windowStartHour: 9, windowEndHour: 19, childCooldownDays: 7, parentWeeklyLimit: 2 },
  };
}

test("status uses the real public GET endpoint without child IDs or assumed parent roles", async () => {
  const requests = [];
  const status = disabledStatus();
  const service = loadService(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => status };
  });

  const result = await service.getStatus();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/parent-reminders/status");
  assert.equal(requests[0].options.method ?? "GET", "GET");
  assert.equal(requests[0].options.body, undefined);
  assert.deepEqual(Object.keys(requests[0].options.headers), ["Content-Type"]);
  assert.equal(requests[0].options.headers["Content-Type"], "application/json");
  assert.deepEqual(result, status);
  assert.equal(result.settingsAvailable, false);
  assert.equal(result.deliveryEnabled, false);
  assert.equal(result.defaults.upcomingExams, false);
  assert.equal(result.defaults.lowActivity, false);
});

test("status forwards the caller's signal and propagates cancellation", async () => {
  const controller = new AbortController();
  let receivedSignal;
  const service = loadService(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        receivedSignal = options.signal;
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      }),
  );

  const pending = service.getStatus(controller.signal);
  assert.equal(receivedSignal, controller.signal);
  controller.abort();

  await assert.rejects(pending, (error) => error === controller.signal.reason);
});

test("HTTP failures reject instead of returning or parsing success status", async () => {
  for (const status of [401, 403, 503]) {
    let jsonCalls = 0;
    const service = loadService(async () => ({
      ok: false,
      status,
      json: async () => {
        jsonCalls += 1;
        return disabledStatus();
      },
    }));

    await assert.rejects(service.getStatus(), new RegExp(`API request failed: ${status}`));
    assert.equal(jsonCalls, 0);
  }
});

test("network failures remain failures so the page can offer retry", async () => {
  const networkError = new TypeError("Network request failed");
  const service = loadService(async () => {
    throw networkError;
  });

  await assert.rejects(service.getStatus(), (error) => error === networkError);
});
