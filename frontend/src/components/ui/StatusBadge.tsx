import { Badge } from "@mantine/core";
import type { AssignmentStatus } from "../../types/domain";
interface StatusBadgeProps {
  status: AssignmentStatus;
}
const classNames: Record<AssignmentStatus, string> = { לביצוע: "todo", הושלם: "completed", באיחור: "overdue" };
export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={"status " + classNames[status]} variant="light">
      {status}
    </Badge>
  );
}
