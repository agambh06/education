import { useEffect, useState } from "react";
import { examsService } from "../services/examsService";
import type { Exam } from "../types/domain";

export function useExams(studentId?: string) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    examsService
      .list(studentId ? { studentId } : {})
      .then((items) => {
        if (active) setExams(items);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  return { exams, loading, error };
}
