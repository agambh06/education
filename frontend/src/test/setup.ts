import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {
    // JSDOM has no layout to observe.
  }
  unobserve() {
    // JSDOM has no layout to observe.
  }
  disconnect() {
    // JSDOM has no layout to observe.
  }
}

window.ResizeObserver = ResizeObserverMock;
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { value: vi.fn(), writable: true });
