import type { SchoolClass, Student, Subject } from "../types/domain";
import { apiRequest } from "./apiClient";

export const schoolStructureService = {
  listStudents: () => apiRequest<Student[]>("/students"),
  listClasses: () => apiRequest<SchoolClass[]>("/classes"),
  listSubjects: () => apiRequest<Subject[]>("/subjects"),
};
