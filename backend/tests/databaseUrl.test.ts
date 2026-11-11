import { describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "./databaseUrl.js";

describe("integration database guard", () => {
  it.each([
    undefined,
    "postgresql://localhost/education_web",
    "postgresql://remote.example/education_web_test",
    "https://localhost/education_web_test",
    "postgresql://localhost/education_web_test?host=remote.example",
    "postgresql://localhost/education_web_test?options=--search_path%3Dpublic",
  ])("rejects unsafe or missing test database configuration: %s", (value) => {
    expect(() => getTestDatabaseUrl(value)).toThrow();
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("accepts an explicit local test database on %s", (host) => {
    expect(getTestDatabaseUrl(`postgresql://test:test@${host}:55432/education_web_test?schema=public`).pathname).toBe(
      "/education_web_test",
    );
  });
});
