import type { Assignment } from "../types/domain";
import { apiRequest } from "./apiClient";

interface AssignmentResponse {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  teacher: string;
  title: string;
  dueAt: string;
  status: "TODO" | "COMPLETED" | "OVERDUE";
  description: string;
}

const assignmentStatuses: Record<AssignmentResponse["status"], Assignment["status"]> = {
  TODO: "לביצוע",
  COMPLETED: "הושלם",
  OVERDUE: "באיחור",
};

function toAssignment(assignment: AssignmentResponse): Assignment {
  return {
    ...assignment,
    dueLabel: new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(assignment.dueAt),
    ),
    status: assignmentStatuses[assignment.status],
    tone: "blue",
  };
}

export const assignmentsService = {
  list: async () => (await apiRequest<AssignmentResponse[]>("/assignments")).map(toAssignment),
  markComplete: async (id: string) =>
    toAssignment(
      await apiRequest<AssignmentResponse>(`/assignments/${encodeURIComponent(id)}/complete`, { method: "PATCH" }),
    ),
};
