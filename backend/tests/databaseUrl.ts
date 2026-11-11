const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Never fall back to DATABASE_URL: that may point at a developer or production database.
export function getTestDatabaseUrl(value: string | undefined): URL {
  if (!value) throw new Error("Set TEST_DATABASE_URL to the isolated local education_web_test database.");

  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !localHosts.has(url.hostname) ||
    url.pathname !== "/education_web_test" ||
    [...url.searchParams.keys()].some((key) => key !== "schema")
  ) {
    throw new Error("Integration tests require a local PostgreSQL database named education_web_test.");
  }

  return url;
}
