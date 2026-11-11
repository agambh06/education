import { afterEach, describe, expect, it, vi } from "vitest";
import { envSchema } from "./env.js";

describe("environment validation", () => {
  const databaseUrl = "postgresql://test:test@localhost:5432/education_web_test";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows the demo API to run without a database URL", () => {
    expect(envSchema.parse({})).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      CORS_ORIGIN: "http://localhost:5173",
    });
  });

  it("defaults CORS to the deployed frontend in a production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { envSchema: productionSchema } = await import("./env.js");

    expect(productionSchema.parse({ NODE_ENV: "production" }).CORS_ORIGIN).toBe("https://education-8mju.vercel.app");
  });

  it("accepts a database URL and fills development defaults", () => {
    expect(envSchema.parse({ DATABASE_URL: databaseUrl })).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      DATABASE_URL: databaseUrl,
      CORS_ORIGIN: "http://localhost:5173",
    });
  });

  it("coerces a configured port while preserving explicit environment values", () => {
    expect(
      envSchema.parse({
        NODE_ENV: "production",
        PORT: "4500",
        DATABASE_URL: databaseUrl,
        CORS_ORIGIN: "https://school.example",
      }),
    ).toEqual({
      NODE_ENV: "production",
      PORT: 4500,
      DATABASE_URL: databaseUrl,
      CORS_ORIGIN: "https://school.example",
    });
  });

  it.each([
    { DATABASE_URL: "not-a-url" },
    { DATABASE_URL: databaseUrl, NODE_ENV: "staging" },
    { DATABASE_URL: databaseUrl, PORT: "0" },
    { DATABASE_URL: databaseUrl, PORT: "1.5" },
    { DATABASE_URL: databaseUrl, PORT: "invalid" },
    { DATABASE_URL: databaseUrl, CORS_ORIGIN: "invalid" },
  ])("rejects invalid configuration: %j", (configuration) => {
    expect(envSchema.safeParse(configuration).success).toBe(false);
  });
});
