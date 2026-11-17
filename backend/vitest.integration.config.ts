import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "threads",
    maxWorkers: 1,
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/globalSetup.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
