import { apiRequest } from "./apiClient";
import type { Assignment } from "../types/domain";
export const assignmentsService = {
  list: () => apiRequest<Assignment[]>("/assignments"),
  markComplete: (id: string) => apiRequest<Assignment>("/assignments/" + id + "/complete", { method: "PATCH" }),
};
