import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, inject, it } from "vitest";
import { checkDatabase } from "../../src/config/database.js";

const databaseUrl = inject("testDatabaseUrl");
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const backendPath = fileURLToPath(new URL("../../", import.meta.url));
const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));

afterAll(() => prisma.$disconnect());

describe("production database migration procedure on an isolated local schema", () => {
  it("applies tracked migrations, verifies the schema, and can safely deploy again", async () => {
    // globalSetup already used migrate deploy against this generated test schema.
    const before = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
      SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY migration_name
    `;
    const expected = (await readdir(new URL("../../prisma/migrations/", import.meta.url), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(before.map((row) => row.migration_name)).toEqual(expected);
    expect(before.every((row) => row.finished_at !== null)).toBe(true);
    const runPrisma = (...args: string[]) =>
      execFileSync(process.execPath, [prismaCli, ...args], {
        cwd: backendPath,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: "utf8",
        timeout: 30_000,
      });
    expect(runPrisma("migrate", "deploy")).toContain("No pending migrations");
    expect(runPrisma("migrate", "status")).toContain("Database schema is up to date");
    await checkDatabase(prisma);
    const after =
      await prisma.$queryRaw`SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY migration_name`;
    expect(after).toEqual(before);
    const output = execFileSync(process.execPath, ["--import", "tsx", "src/scripts/check-database.ts"], {
      cwd: backendPath,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(output.trim()).toBe("Database connection, schema, and tracked migrations verified.");
  }, 120_000);
});
