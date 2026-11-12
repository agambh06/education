import { Prisma, PrismaClient } from "@prisma/client";
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

function toReminderLink(link: StoredParentLink): ReminderParentLink {
  return {
    parentId: link.parentId,
    studentId: link.studentId,
    parentRole: link.parent.role,
    verifiedAt: link.verifiedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    examsShared: link.examsShared,
    activityShared: link.activityShared,
  };
}

// No demo data: this adapter is only reached after trusted authentication exists.
export const learningReminderPreferenceStore: LearningReminderPreferenceStore = {
  async read(parentId, studentId) {
    const stored = await database().parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
      include: includeReminderContext,
    });
    if (!stored) return { link: null, preferences: null };
    const preferences = stored.reminderPreferences;
    return {
      link: toReminderLink(stored),
      preferences: preferences
        ? {
            upcomingExams: preferences.upcomingExams,
            lowActivity: preferences.lowActivity,
            timeZone: preferences.timeZone,
            linkVerifiedAt: preferences.linkVerifiedAt.toISOString(),
          }
        : null,
    };
  },

  async saveForVerifiedLink(parentId, studentId, verifiedAt, preferences) {
    try {
      return await database().$transaction(
        async (transaction) => {
          const stored = await transaction.parentStudent.findUnique({
            where: { parentId_studentId: { parentId, studentId } },
            include: includeReminderContext,
          });
          const link = stored ? toReminderLink(stored) : null;
          if (
            !isActiveReminderLink(link, parentId, studentId) ||
            link.verifiedAt !== verifiedAt ||
            (preferences.upcomingExams && !link.examsShared) ||
            (preferences.lowActivity && (!link.examsShared || !link.activityShared))
          ) {
            return false;
          }
          const data = { ...preferences, linkVerifiedAt: new Date(verifiedAt) };
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
      // A concurrent revocation/unlink wins; never retry using a stale verification.
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2003")) {
        return false;
      }
      throw error;
    }
  },
};
