export interface LearningReminderPreferenceValues {
  upcomingExams: boolean;
  lowActivity: boolean;
  timeZone: string;
}

export interface LearningReminderPreferences extends LearningReminderPreferenceValues {
  // A new verification requires fresh consent, even for the same parent and child.
  linkVerifiedAt: string;
}

export interface ReminderParentSession {
  userId: string;
  role: "PARENT" | "TEACHER" | "ADMIN";
}

export interface ReminderParentLink {
  parentId: string;
  studentId: string;
  parentRole: ReminderParentSession["role"];
  verifiedAt: string | null;
  revokedAt: string | null;
  examsShared: boolean;
  activityShared: boolean;
}

export interface LearningReminderContext {
  link: ReminderParentLink | null;
  preferences: LearningReminderPreferences | null;
}

export interface LearningReminderPreferenceStore {
  read(parentId: string, studentId: string): Promise<LearningReminderContext>;
  // The store must recheck verification and permissions atomically with the write.
  saveForVerifiedLink(
    parentId: string,
    studentId: string,
    verifiedAt: string,
    preferences: LearningReminderPreferenceValues,
  ): Promise<boolean>;
}

export interface ReminderExam {
  id: string;
  studentId: string;
  startsAt: string;
  published: boolean;
  topicIds: string[];
}

// Only permitted activity counts belong here; never private answers or scores.
export interface ReminderTopicActivity {
  studentId: string;
  topicId: string;
  windowStartedAt: string;
  windowEndedAt: string;
  practiceCount: number;
}

export type LearningReminderKind = "UPCOMING_EXAM" | "LOW_ACTIVITY";

export interface LearningReminderHistory {
  parentId: string;
  studentId: string;
  kind: LearningReminderKind;
  examId: string;
  sentAt: string;
}

export interface LearningReminderInput extends LearningReminderContext {
  parentId: string;
  studentId: string;
  now: Date;
  exams: ReminderExam[];
  activity: ReminderTopicActivity[];
  // Complete delivery history for this parent, across children and reminder types.
  history: LearningReminderHistory[];
}

export interface LearningReminderCandidate {
  parentId: string;
  studentId: string;
  examId: string;
  kind: LearningReminderKind;
  preview: { title: string; body: string };
  // For an authenticated parent view only, separate from the shared-device preview.
  recommendation: { kind: "PLAN_TOGETHER" } | { kind: "SHORT_TOPIC_PRACTICE"; topicId: string };
}
