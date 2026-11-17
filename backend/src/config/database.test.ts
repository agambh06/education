import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { database } from "./database.js";

describe("database configuration and verification failures", () => {
  it("requires explicit database configuration without silently falling back", () => {
    vi.stubEnv("DATABASE_URL", "");
    try {
      expect(() => database()).toThrow("Database is not configured.");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each(["", "postgresql://private-user:private-password@127.0.0.1:1/private-db?connect_timeout=1"])(
    "fails the operator check safely for missing or unreachable configuration (%#)",
    (databaseUrl) => {
      const result = spawnSync(process.execPath, ["--import", "tsx", "src/scripts/check-database.ts"], {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: "utf8",
        timeout: 15_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr.trim()).toBe(
        "Database verification failed. Check server credentials, connectivity, and migration status.",
      );
    },
    20_000,
  );
});
