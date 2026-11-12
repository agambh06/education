import type {
  ParentExamProgress,
  ParentLearningProgress,
  ParentLinkedChild,
  ParentTopicProgress,
} from "../types/parentProgress";
import { apiRequest } from "./apiClient";

export interface ParentProgressService {
  listChildren(signal?: AbortSignal): Promise<ParentLinkedChild[]>;
  getProgress(childId: string, signal?: AbortSignal): Promise<ParentLearningProgress>;
}

export class ParentProgressDataError extends Error {
  constructor() {
    super("Invalid parent progress response");
    this.name = "ParentProgressDataError";
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ParentProgressDataError();
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new ParentProgressDataError();
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ParentProgressDataError();
  return value;
}

function date(value: unknown): string {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) throw new ParentProgressDataError();
  return result;
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  if (new Set(values.map(({ id }) => id)).size !== values.length) throw new ParentProgressDataError();
  return values;
}

function parseChild(value: unknown): ParentLinkedChild {
  const child = record(value);
  return { id: text(child.id), firstName: text(child.firstName), lastName: text(child.lastName) };
}

function parseTopic(value: unknown): ParentTopicProgress {
  const topic = record(value);
  if (typeof topic.needsReview !== "boolean") throw new ParentProgressDataError();
  return {
    id: text(topic.id),
    title: text(topic.title),
    practiceCount: count(topic.practiceCount),
    needsReview: topic.needsReview,
  };
}

function parseExam(value: unknown): ParentExamProgress {
  const exam = record(value);
  if (!Array.isArray(exam.topics)) throw new ParentProgressDataError();
  return {
    id: text(exam.id),
    subject: text(exam.subject),
    title: text(exam.title),
    scheduledAt: date(exam.scheduledAt),
    topics: uniqueById(exam.topics.map(parseTopic)),
  };
}

function parseProgress(value: unknown, childId: string): ParentLearningProgress {
  const progress = record(value);
  const activity = record(progress.activity);
  if (progress.childId !== childId || !Array.isArray(progress.exams)) throw new ParentProgressDataError();
  return {
    childId,
    activity: {
      sessionCount: count(activity.sessionCount),
      questionCount: count(activity.questionCount),
      practiceMinutes: count(activity.practiceMinutes),
      lastPracticedAt: activity.lastPracticedAt === null ? null : date(activity.lastPracticedAt),
    },
    exams: uniqueById(progress.exams.map(parseExam)),
  };
}

const readOptions = (signal?: AbortSignal): RequestInit => ({ credentials: "include", cache: "no-store", signal });

// These endpoints must authenticate the parent and recheck verified links on every request.
// Only aggregate fields are copied; private material in an unexpected response is discarded.
export const parentProgressService: ParentProgressService = {
  async listChildren(signal) {
    const response = record(await apiRequest<unknown>("/parent/children", readOptions(signal)));
    if (!Array.isArray(response.children)) throw new ParentProgressDataError();
    return uniqueById(response.children.map(parseChild));
  },
  async getProgress(childId, signal) {
    text(childId);
    const response = await apiRequest<unknown>(
      `/parent/children/${encodeURIComponent(childId)}/learning-progress`,
      readOptions(signal),
    );
    return parseProgress(response, childId);
  },
};
