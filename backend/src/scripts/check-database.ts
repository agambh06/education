import "dotenv/config";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { checkDatabase } from "../config/database.js";

// This compiled script lives in dist/scripts; resolve migrations independently of cwd.
const migrationsPath = fileURLToPath(new URL("../../prisma/migrations/", import.meta.url));
let client: PrismaClient | undefined;

try {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  client = new PrismaClient({ log: [] });
  await checkDatabase(client);
  const expected = (await readdir(migrationsPath, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const applied = await client.$queryRaw<
    { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
  >`
    SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"
  `;
  if (
    expected.length === 0 ||
    applied.some((row) => !row.finished_at && !row.rolled_back_at) ||
    expected.some(
      (name) => !applied.some((row) => row.migration_name === name && row.finished_at && !row.rolled_back_at),
    )
  ) {
    throw new Error("Database migrations are incomplete.");
  }
  console.info("Database connection, schema, and tracked migrations verified.");
} catch {
  // Prisma errors may contain connection strings or host details. Never print them.
  console.error("Database verification failed. Check server credentials, connectivity, and migration status.");
  process.exitCode = 1;
} finally {
  if (client) {
    try {
      await client.$disconnect();
    } catch {
      console.error("Database disconnect failed.");
      process.exitCode = 1;
    }
  }
}
