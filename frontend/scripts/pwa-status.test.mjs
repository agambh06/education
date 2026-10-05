import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/pwa/PwaStatus.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

// Run the real component's callbacks with browser and hook boundaries controlled.
// No worker or network request is made by these lifecycle regression tests.
function setup({ registered = true } = {}) {
  const events = new Map();
  const state = { online: true, visibilityState: "visible", needRefresh: true };
  let updateCalls = 0;
  let cleanup;
  let interval;
  let clearedInterval;
  const registration = {
    waiting: {},
    update() {
      updateCalls += 1;
      return Promise.resolve();
    },
  };
  const target = (prefix) => ({
    addEventListener(name, handler) {
      events.set(`${prefix}:${name}`, handler);
    },
    removeEventListener(name, handler) {
      assert.equal(events.get(`${prefix}:${name}`), handler);
      events.delete(`${prefix}:${name}`);
    },
  });
  const exports = {};
  const setNeedRefresh = (value) => {
    state.needRefresh = value;
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@mantine/core": { Alert: "Alert", Button: "Button", Stack: "Stack" },
    "@mantine/hooks": { useNetwork: () => ({ online: state.online }) },
    react: {
      useState: () => [registered ? registration : undefined, () => {}],
      useEffect: (effect) => {
        cleanup = effect();
      },
    },
    "virtual:pwa-register/react": {
      useRegisterSW: () => ({
        needRefresh: [state.needRefresh, setNeedRefresh],
        updateServiceWorker: () => Promise.resolve(),
      }),
    },
    "./strings": { pwaStrings: {} },
  };
  runInNewContext(outputText, {
    exports,
    require(name) {
      assert(name in modules, name);
      return modules[name];
    },
    navigator: {
      get onLine() {
        return state.online;
      },
    },
    document: {
      ...target("document"),
      get visibilityState() {
        return state.visibilityState;
      },
    },
    window: {
      ...target("window"),
      setInterval(callback, milliseconds) {
        assert.equal(milliseconds, 60 * 60 * 1000);
        interval = callback;
        return 42;
      },
      clearInterval(id) {
        clearedInterval = id;
      },
    },
    console,
  });
  const view = exports.PwaStatus();
  return {
    state,
    registration,
    events,
    view,
    check: () => interval(),
    cleanup: () => cleanup(),
    get updateCalls() {
      return updateCalls;
    },
    get clearedInterval() {
      return clearedInterval;
    },
  };
}

test("a dismissed waiting update is offered again on the next check", () => {
  const app = setup();
  const updateAlert = app.view.props.children.find((child) => child?.props?.withCloseButton);
  updateAlert.props.onClose();
  assert.equal(app.state.needRefresh, false);
  app.events.get("document:visibilitychange")();
  assert.equal(app.state.needRefresh, true);
  assert.equal(app.updateCalls, 1);
});

test("offline and hidden tabs do not check or reopen a dismissed notice", () => {
  const app = setup();
  app.state.needRefresh = false;
  app.state.online = false;
  app.events.get("window:online")();
  app.state.online = true;
  app.state.visibilityState = "hidden";
  app.check();
  assert.equal(app.state.needRefresh, false);
  assert.equal(app.updateCalls, 0);
  app.state.visibilityState = "visible";
  app.check();
  assert.equal(app.state.needRefresh, true);
  assert.equal(app.updateCalls, 1);
});

test("no waiting worker means no update reminder", () => {
  const app = setup();
  app.state.needRefresh = false;
  app.registration.waiting = null;
  app.check();
  assert.equal(app.state.needRefresh, false);
  assert.equal(app.updateCalls, 1);
});

test("unmount removes the timer and both event listeners", () => {
  const app = setup();
  app.cleanup();
  assert.equal(app.clearedInterval, 42);
  assert.equal(app.events.size, 0);
});

test("no registered worker means no timer or event listeners", () => {
  const app = setup({ registered: false });
  assert.equal(app.events.size, 0);
  assert.equal(app.updateCalls, 0);
});
