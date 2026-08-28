import type { Assignment, AssignmentStatus, Student } from "../../types/domain";
import { AssignmentCard } from "../../components/assignments/AssignmentCard";
import { PageHeader } from "../../components/ui/PageHeader";
interface Props {
  assignments: Assignment[];
  students: Student[];
  filter: "הכול" | AssignmentStatus;
  onFilterChange: (filter: "הכול" | AssignmentStatus) => void;
  onComplete: (id: string) => void;
}
export function AssignmentsPage({ assignments, students, filter, onFilterChange, onComplete }: Props) {
  const studentName = (id: string) => students.find((student) => student.id === id)?.firstName ?? "";
  return (
    <>
      <PageHeader
        eyebrow="למידה משפחתית"
        title="משימות"
        description="כאן אפשר לעקוב אחר כל משימה, מועד והישג."
        action={<button className="primary">◫ הורדת סיכום</button>}
      />
      <div className="tabs">
        {(["הכול", "לביצוע", "הושלם", "באיחור"] as const).map((item) => (
          <button key={item} onClick={() => onFilterChange(item)} className={filter === item ? "selected" : ""}>
            {item}
            {item === "לביצוע" && <b>3</b>}
          </button>
        ))}
      </div>
      <div className="assignment-grid">
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            studentName={studentName(assignment.studentId)}
            onComplete={onComplete}
          />
        ))}
      </div>
    </>
  );
}
