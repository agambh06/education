import { useEffect, useState } from "react";
import type { SchoolClass, Student } from "../types/domain";
import { schoolStructureService } from "../services/schoolStructureService";

export function useSchoolStructure() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([schoolStructureService.listStudents(), schoolStructureService.listClasses()])
      .then(([nextStudents, nextClasses]) => {
        if (!active) return;
        setStudents(nextStudents);
        setClasses(nextClasses);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return { students, classes, error };
}
