import type { ParentProgressService } from "../services/parentProgressService";
import type { ParentLearningProgress, ParentLinkedChild } from "../types/parentProgress";

const children: ParentLinkedChild[] = [
  { id: "demo-child-1", firstName: "מאיה", lastName: "דוגמה" },
  { id: "demo-child-2", firstName: "איתי", lastName: "דוגמה" },
];

const progress: ParentLearningProgress[] = [
  {
    childId: "demo-child-1",
    activity: { sessionCount: 4, questionCount: 28, practiceMinutes: 65, lastPracticedAt: "2026-11-10T15:00:00Z" },
    exams: [
      {
        id: "demo-exam-1",
        subject: "מתמטיקה",
        title: "שברים",
        scheduledAt: "2026-11-18T08:00:00Z",
        topics: [
          { id: "demo-topic-1", title: "השוואת שברים", practiceCount: 12, needsReview: false },
          { id: "demo-topic-2", title: "חיבור שברים", practiceCount: 6, needsReview: true },
          { id: "demo-topic-3", title: "חיסור שברים", practiceCount: 0, needsReview: false },
        ],
      },
    ],
  },
  {
    childId: "demo-child-2",
    activity: { sessionCount: 0, questionCount: 0, practiceMinutes: 0, lastPracticedAt: null },
    exams: [],
  },
];

export const parentProgressDemo: ParentProgressService = {
  async listChildren() {
    return structuredClone(children);
  },
  async getProgress(childId) {
    const childProgress = progress.find((item) => item.childId === childId);
    if (!childProgress) throw new Error("Unknown demo child");
    const result = structuredClone(childProgress);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    if (result.activity.sessionCount > 0) result.activity.lastPracticedAt = new Date(now - day).toISOString();
    for (const exam of result.exams) exam.scheduledAt = new Date(now + 7 * day).toISOString();
    return result;
  },
};
