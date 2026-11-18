import type { Assignment } from "../types/domain";

export interface ApiAssignment {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  status: "TODO" | "COMPLETED" | "OVERDUE";
  studentId: string;
  subject: { name: string };
  teacher: { firstName: string; lastName: string };
}

export function mapApiAssignment(
  item: ApiAssignment,
  statuses: { toDo: string; completed: string; overdue: string },
): Assignment;
