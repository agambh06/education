import type { Assignment } from "../types/domain";
import { apiRequest } from "./apiClient";
export const assignmentsService = {
  list: () => apiRequest<Assignment[]>("/assignments"),
  markComplete: (id: string) => apiRequest<Assignment>(`/assignments/${id}/complete`, { method: "PATCH" }),
};
