import { apiRequest } from "./apiClient";

export type LearningReminderBlocker = "AUTHENTICATION" | "VERIFIED_LINKS" | "PERMITTED_PROGRESS" | "PRIVACY_REVIEW";

export interface LearningReminderStatus {
  settingsAvailable: boolean;
  deliveryEnabled: boolean;
  blockedBy: LearningReminderBlocker[];
  defaults: {
    upcomingExams: boolean;
    lowActivity: boolean;
    timeZone: string;
  };
  policy: {
    windowStartHour: number;
    windowEndHour: number;
    childCooldownDays: number;
    parentWeeklyLimit: number;
  };
}

export const learningRemindersService = {
  getStatus: (signal?: AbortSignal) => apiRequest<LearningReminderStatus>("/parent-reminders/status", { signal }),
};
