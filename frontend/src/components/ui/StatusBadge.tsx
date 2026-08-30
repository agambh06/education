import { Badge } from "@mantine/core";
import { commonStrings } from "../../shared/strings/common";
import type { AssignmentStatus } from "../../types/domain";

interface Props {
  status: AssignmentStatus;
}
const colors: Record<AssignmentStatus, string> = {
  [commonStrings.toDo]: "orange",
  [commonStrings.completed]: "teal",
  [commonStrings.overdue]: "red",
};
export function StatusBadge({ status }: Props) {
  return (
    <Badge color={colors[status]} variant="light">
      {status}
    </Badge>
  );
}
