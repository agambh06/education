import { useCallback, useEffect, useMemo, useState } from "react";
import { assignmentDataStrings } from "../components/assignments/strings";
import { ALL_STUDENTS_ID } from "../constants/app";
import { assignmentsService } from "../services/assignmentsService";
import { commonStrings } from "../shared/strings/common";
import type { Assignment, AssignmentStatus } from "../types/domain";

export function useAssignments(
  selectedStudentId: string,
  filter: "הכול" | AssignmentStatus,
  selectedStudentName?: string,
) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await assignmentsService.list());
    } catch {
      setError(assignmentDataStrings.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (selectedStudentId === ALL_STUDENTS_ID ||
            item.studentId === selectedStudentId ||
            (selectedStudentName !== undefined && item.studentName.startsWith(selectedStudentName))) &&
          (filter === commonStrings.all || item.status === filter),
      ),
    [items, selectedStudentId, selectedStudentName, filter],
  );
  const complete = async (id: string) => {
    setError(null);
    try {
      const updated = await assignmentsService.markComplete(id);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      return true;
    } catch {
      setError(assignmentDataStrings.completeError);
      return false;
    }
  };

  return { visibleItems, complete, loading, error, reload };
}
