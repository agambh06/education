import type {
  LearningReminderCandidate,
  LearningReminderInput,
  ReminderParentLink,
} from "./learning-reminders.types.js";

const DAY_MS = 24 * 60 * 60 * 1_000;

export const learningReminderDefaults = Object.freeze({
  upcomingExams: false,
  lowActivity: false,
  timeZone: "Asia/Jerusalem",
});

export const learningReminderPolicy = Object.freeze({
  windowStartHour: 9,
  windowEndHour: 19,
  childCooldownDays: 7,
  parentWeeklyLimit: 2,
});

// No transport may be selected or enabled until a separate privacy review.
export const learningReminderStatus = Object.freeze({
  settingsAvailable: false,
  deliveryEnabled: false,
  blockedBy: ["AUTHENTICATION", "VERIFIED_LINKS", "PERMITTED_PROGRESS", "PRIVACY_REVIEW"],
  defaults: learningReminderDefaults,
  policy: learningReminderPolicy,
});

const genericPreview = Object.freeze({
  title: "עדכון למידה זמין",
  body: "אפשר לפתוח את אזור ההורים בזמן שנוח לכם.",
});

export function isValidReminderTimeZone(value: string): boolean {
  // Offset strings skip daylight-saving rules; save an IANA identifier instead.
  if (typeof value !== "string" || value.length === 0 || /^[+-]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function isActiveReminderLink(
  link: ReminderParentLink | null,
  parentId: string,
  studentId: string,
  now: Date = new Date(),
): link is ReminderParentLink & { verifiedAt: string } {
  return (
    link !== null &&
    link.parentId === parentId &&
    link.studentId === studentId &&
    link.parentRole === "PARENT" &&
    link.verifiedAt !== null &&
    Number.isFinite(Date.parse(link.verifiedAt)) &&
    Date.parse(link.verifiedAt) <= now.getTime() &&
    link.revokedAt === null
  );
}

// A policy decision only. This function never queues, persists, or sends anything.
export function evaluateLearningReminder(input: LearningReminderInput): LearningReminderCandidate | null {
  const { parentId, studentId, link, preferences, now } = input;
  const nowMs = now.getTime();
  if (
    !Number.isFinite(nowMs) ||
    !isActiveReminderLink(link, parentId, studentId, now) ||
    !preferences ||
    preferences.linkVerifiedAt !== link.verifiedAt ||
    (!preferences.upcomingExams && !preferences.lowActivity) ||
    !isValidReminderTimeZone(preferences.timeZone)
  ) {
    return null;
  }

  const localHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: preferences.timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  if (localHour < learningReminderPolicy.windowStartHour || localHour >= learningReminderPolicy.windowEndHour) {
    return null;
  }

  const parentHistory = input.history.filter((entry) => entry.parentId === parentId);
  // Uncertain/future delivery history cannot safely prove that a limit is clear.
  if (parentHistory.some((entry) => !Number.isFinite(Date.parse(entry.sentAt)) || Date.parse(entry.sentAt) > nowMs)) {
    return null;
  }
  const recent = parentHistory.filter(
    (entry) => Date.parse(entry.sentAt) > nowMs - learningReminderPolicy.childCooldownDays * DAY_MS,
  );
  if (
    recent.length >= learningReminderPolicy.parentWeeklyLimit ||
    recent.some((entry) => entry.studentId === studentId)
  ) {
    return null;
  }

  // Dates, scope and publication come from trusted server adapters, never display labels.
  const exams = input.exams
    .filter((exam) => {
      const startsAt = Date.parse(exam.startsAt);
      return (
        exam.studentId === studentId &&
        exam.published &&
        startsAt > nowMs &&
        startsAt <= nowMs + 7 * DAY_MS &&
        !parentHistory.some((entry) => entry.studentId === studentId && entry.examId === exam.id)
      );
    })
    .sort(
      (first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt) || first.id.localeCompare(second.id),
    );

  if (!link.examsShared || exams.length === 0) return null;
  if (preferences.upcomingExams) {
    return {
      parentId,
      studentId,
      examId: exams[0].id,
      kind: "UPCOMING_EXAM",
      preview: { ...genericPreview },
      recommendation: { kind: "PLAN_TOGETHER" },
    };
  }
  if (!preferences.lowActivity || !link.activityShared) return null;

  for (const exam of exams) {
    const topic = input.activity.find((entry) => {
      const start = Date.parse(entry.windowStartedAt);
      const end = Date.parse(entry.windowEndedAt);
      return (
        entry.studentId === studentId &&
        exam.topicIds.includes(entry.topicId) &&
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        // A complete, known seven-day window; absent data is never inactivity.
        end - start === 7 * DAY_MS &&
        end <= nowMs &&
        nowMs - end <= DAY_MS &&
        Number.isInteger(entry.practiceCount) &&
        entry.practiceCount >= 0 &&
        entry.practiceCount <= 1
      );
    });
    if (topic) {
      return {
        parentId,
        studentId,
        examId: exam.id,
        kind: "LOW_ACTIVITY",
        preview: { ...genericPreview },
        recommendation: { kind: "SHORT_TOPIC_PRACTICE", topicId: topic.topicId },
      };
    }
  }
  return null;
}
