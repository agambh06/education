import { z } from "zod";
import {
  isActiveReminderLink,
  isValidReminderTimeZone,
  learningReminderDefaults,
} from "./learning-reminders.policy.js";
import type {
  LearningReminderPreferenceStore,
  LearningReminderPreferenceValues,
  ReminderParentSession,
} from "./learning-reminders.types.js";

export const learningReminderPreferencesSchema = z
  .object({
    upcomingExams: z.boolean(),
    lowActivity: z.boolean(),
    timeZone: z.string().min(1).max(80).refine(isValidReminderTimeZone),
  })
  .strict();

export class LearningReminderAccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Verified parent link required");
  }
}

export class LearningReminderPreferencesService {
  constructor(private readonly store: LearningReminderPreferenceStore) {}

  private requireParent(session: ReminderParentSession | null): ReminderParentSession {
    if (!session) throw new LearningReminderAccessError(401);
    if (session.role !== "PARENT") throw new LearningReminderAccessError(403);
    return session;
  }

  async getPreferences(
    session: ReminderParentSession | null,
    studentId: string,
  ): Promise<LearningReminderPreferenceValues> {
    const parent = this.requireParent(session);
    const { link, preferences } = await this.store.read(parent.userId, studentId);
    if (!isActiveReminderLink(link, parent.userId, studentId)) throw new LearningReminderAccessError(403);
    if (preferences?.linkVerifiedAt !== link.verifiedAt) return { ...learningReminderDefaults };
    return {
      upcomingExams: preferences.upcomingExams && link.examsShared,
      lowActivity: preferences.lowActivity && link.examsShared && link.activityShared,
      timeZone: preferences.timeZone,
    };
  }

  async savePreferences(
    session: ReminderParentSession | null,
    studentId: string,
    input: unknown,
  ): Promise<LearningReminderPreferenceValues> {
    const parent = this.requireParent(session);
    const preferences = learningReminderPreferencesSchema.parse(input);
    const { link } = await this.store.read(parent.userId, studentId);
    if (
      !isActiveReminderLink(link, parent.userId, studentId) ||
      (preferences.upcomingExams && !link.examsShared) ||
      (preferences.lowActivity && (!link.examsShared || !link.activityShared))
    ) {
      throw new LearningReminderAccessError(403);
    }
    const saved = await this.store.saveForVerifiedLink(parent.userId, studentId, link.verifiedAt, preferences);
    if (!saved) throw new LearningReminderAccessError(403);
    return preferences;
  }
}
