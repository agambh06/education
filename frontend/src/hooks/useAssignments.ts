import { useMemo, useState } from "react";
import { ALL_STUDENTS_ID } from "../constants/app";
import { assignments as initialAssignments } from "../data/mockData";
import { commonStrings } from "../shared/strings/common";
import type { Assignment, AssignmentStatus } from "../types/domain";
export function useAssignments(selectedStudentId: string, filter: "הכול" | AssignmentStatus) {
  const [items, setItems] = useState<Assignment[]>(initialAssignments);
  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (selectedStudentId === ALL_STUDENTS_ID || item.studentId === selectedStudentId) &&
          (filter === commonStrings.all || item.status === filter),
      ),
    [items, selectedStudentId, filter],
  );
  const complete = (id: string) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status: commonStrings.completed } : item)),
    );
  return { visibleItems, complete };
}
