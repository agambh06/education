import type { Exam } from "../types/domain";
import { apiRequest } from "./apiClient";

export const examsService = {
  list: (filters: { classId?: string } = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiRequest<Exam[]>(`/exams${query ? `?${query}` : ""}`);
  },
};
