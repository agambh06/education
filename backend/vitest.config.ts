import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/databaseUrl.test.ts"],
    restoreMocks: true,
    env: {
      NODE_ENV: "test",
      PORT: "4000",
      CORS_ORIGIN: "http://localhost:5173",
      DATABASE_URL: "postgresql://test:test@localhost:5432/education_web_unit_test",
    },
  },
});
