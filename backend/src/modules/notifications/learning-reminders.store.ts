import { Prisma, PrismaClient } from "@prisma/client";
import { assertVerifiedParentLink, ParentLinkError } from "../parent-links/parent-links.service.js";
import { isActiveReminderLink } from "./learning-reminders.policy.js";
import type { LearningReminderPreferenceStore, ReminderParentLink } from "./learning-reminders.types.js";

let prisma: PrismaClient | undefined;
function database(): PrismaClient {
  prisma ??= new PrismaClient();
  return prisma;
}

const includeReminderContext = {
  parent: { select: { role: true } },
  reminderPreferences: true,
} satisfies Prisma.ParentStudentInclude;

type StoredParentLink = Prisma.ParentStudentGetPayload<{ include: typeof includeReminderContext }>;

// Call only after assertVerifiedParentLink succeeds in the same transaction.
function toReminderLink(link: StoredParentLink): ReminderParentLink {
  return {
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    parentRole: link.parent.role,
    status: link.status,
    consentVersion: link.consentVersion,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    accessVerified: true,
    verifiedAt: link.verifiedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    examsShared: link.examsShared,
    activityShared: link.activityShared,
  };
}

export function createLearningReminderPreferenceStore(
  client: PrismaClient,
  now: () => Date = () => new Date(),
): LearningReminderPreferenceStore {
  return {
    async read(parentId, studentId) {
      try {
        return await client.$transaction(
          async (transaction) => {
            const at = now();
            await assertVerifiedParentLink(transaction, parentId, studentId, at);
            const stored = await transaction.parentStudent.findUnique({
              where: { parentId_studentId: { parentId, studentId } },
              include: includeReminderContext,
            });
            const link = stored ? toReminderLink(stored) : null;
            if (!isActiveReminderLink(link, parentId, studentId, at) || !stored) {
              return { link: null, preferences: null };
            }
            const preferences = stored.reminderPreferences;
            return {
              link,
              preferences: preferences
                ? {
                    upcomingExams: preferences.upcomingExams,
                    lowActivity: preferences.lowActivity,
                    timeZone: preferences.timeZone,
                    linkId: preferences.linkId,
                    linkVerifiedAt: preferences.linkVerifiedAt.toISOString(),
                  }
                : null,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (error instanceof ParentLinkError) return { link: null, preferences: null };
        throw error;
      }
    },

    async saveForVerifiedLink(parentId, studentId, linkId, verifiedAt, preferences) {
      try {
        return await client.$transaction(
          async (transaction) => {
            const at = now();
            await assertVerifiedParentLink(transaction, parentId, studentId, at);
            const stored = await transaction.parentStudent.findUnique({
              where: { parentId_studentId: { parentId, studentId } },
              include: includeReminderContext,
            });
            const link = stored ? toReminderLink(stored) : null;
            if (
              !isActiveReminderLink(link, parentId, studentId, at) ||
              link.id !== linkId ||
              link.verifiedAt !== verifiedAt ||
              (preferences.upcomingExams && !link.examsShared) ||
              (preferences.lowActivity && (!link.examsShared || !link.activityShared))
            ) {
              return false;
            }
            const data = { ...preferences, linkId, linkVerifiedAt: new Date(verifiedAt) };
            await transaction.learningReminderPreference.upsert({
              where: { parentId_studentId: { parentId, studentId } },
              create: { parentId, studentId, ...data },
              update: data,
            });
            return true;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (error instanceof ParentLinkError) return false;
        // A concurrent revocation/unlink wins; never retry using stale consent.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || error.code === "P2003")
        ) {
          return false;
        }
        throw error;
      }
    },
  };
}

// No demo data or eager connection; production still requires trusted authentication.
export const learningReminderPreferenceStore: LearningReminderPreferenceStore = {
  read: (parentId, studentId) => createLearningReminderPreferenceStore(database()).read(parentId, studentId),
  saveForVerifiedLink: (parentId, studentId, linkId, verifiedAt, preferences) =>
    createLearningReminderPreferenceStore(database()).saveForVerifiedLink(
      parentId,
      studentId,
      linkId,
      verifiedAt,
      preferences,
    ),
};
