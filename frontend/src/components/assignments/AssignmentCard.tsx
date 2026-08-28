import type { Assignment } from "../../types/domain";
import { StatusBadge } from "../ui/StatusBadge";
interface AssignmentCardProps {
  assignment: Assignment;
  studentName: string;
  onComplete: (id: string) => void;
}
export function AssignmentCard({ assignment, studentName, onComplete }: AssignmentCardProps) {
  return (
    <article className="assignment-card">
      <div>
        <i className={"dot " + assignment.tone} />
        <StatusBadge status={assignment.status} />
      </div>
      <p className="subject">
        {assignment.subject} · {studentName}
      </p>
      <h3>{assignment.title}</h3>
      <p>{assignment.description}</p>
      <small>
        ◷ {assignment.dueLabel}
        <br />◉ {assignment.teacher}
      </small>
      {assignment.status === "לביצוע" ? (
        <button className="complete" onClick={() => onComplete(assignment.id)}>
          סימון כהושלם
        </button>
      ) : (
        <button className="link">לפרטים ←</button>
      )}
    </article>
  );
}
