export type DemoAssignmentStatus = "TODO" | "COMPLETED" | "OVERDUE";
export interface DemoAssignment {
  id: string;
  title: string;
  subject: string;
  studentId: string;
  status: DemoAssignmentStatus;
  dueAt: string;
}
const assignments: DemoAssignment[] = [
  {
    id: "a1",
    title: "דף תרגול שברים",
    subject: "מתמטיקה",
    studentId: "noa",
    status: "TODO",
    dueAt: "2026-03-12T09:00:00.000Z",
  },
];
export const assignmentsService = {
  list: (studentId: string) => assignments.filter((item) => item.studentId === studentId),
  complete: (id: string, studentId: string) => {
    const assignment = assignments.find((item) => item.id === id && item.studentId === studentId);
    if (!assignment) return undefined;
    assignment.status = "COMPLETED";
    return assignment;
  },
};
