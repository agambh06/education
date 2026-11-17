import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import type { TestProject } from "vitest/node";
import { getTestDatabaseUrl } from "../databaseUrl.js";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const databaseUrl = getTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  databaseUrl.searchParams.set("schema", schema);
  const datasourceUrl = databaseUrl.toString();
  const prisma = new PrismaClient({ datasourceUrl });
  // The schema name is generated here and never taken from an environment variable.
  const cleanup = async () => {
    try {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await prisma.$disconnect();
    }
  };

  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url)),
        "db",
        "push",
        "--skip-generate",
        "--schema",
        fileURLToPath(new URL("../../prisma/schema.prisma", import.meta.url)),
      ],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        env: { ...process.env, NODE_ENV: "test", DATABASE_URL: datasourceUrl },
        stdio: "pipe",
        timeout: 60_000,
      },
    );
    project.provide("testDatabaseUrl", datasourceUrl);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return cleanup;
}
