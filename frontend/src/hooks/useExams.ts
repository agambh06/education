import { useEffect, useState } from "react";
import { examsService } from "../services/examsService";
import type { Exam } from "../types/domain";

export function useExams(enabled: boolean) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setLoading(false);
      setError(true);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(false);
    examsService
      .list()
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
  }, [enabled]);

  return { exams, loading, error };
}
