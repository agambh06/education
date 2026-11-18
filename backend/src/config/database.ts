import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

export function database(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  prisma ??= new PrismaClient({ log: [] });
  return prisma;
}

// Zero-row queries check the deployed schema without reading personal data.
export async function checkDatabase(client: Pick<PrismaClient, "$queryRaw">): Promise<void> {
  await client.$queryRaw`SELECT 1`;
  await client.$queryRaw`SELECT "id", "accountVerifiedAt" FROM "User" WHERE false`;
  await client.$queryRaw`SELECT "id", "passwordHash" FROM "User" WHERE false`;
  await client.$queryRaw`SELECT "id", "tokenHash", "userId", "expiresAt" FROM "Session" WHERE false`;
  await client.$queryRaw`SELECT "id", "status", "examsShared", "activityShared" FROM "ParentStudent" WHERE false`;
  await client.$queryRaw`SELECT "parentId", "studentId", "linkId", "linkVerifiedAt" FROM "LearningReminderPreference" WHERE false`;
}
