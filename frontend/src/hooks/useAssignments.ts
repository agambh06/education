import { useMemo, useState } from "react";
import { assignments as initialAssignments } from "../data/mockData";
import type { Assignment, AssignmentStatus } from "../types/domain";
export function useAssignments(selectedStudentId: string, filter: "הכול" | AssignmentStatus) {
  const [items, setItems] = useState<Assignment[]>(initialAssignments);
  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (selectedStudentId === "all" || item.studentId === selectedStudentId) &&
          (filter === "הכול" || item.status === filter),
      ),
    [items, selectedStudentId, filter],
  );
  const complete = (id: string) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status: "הושלם" } : item)));
  return { visibleItems, complete };
}
