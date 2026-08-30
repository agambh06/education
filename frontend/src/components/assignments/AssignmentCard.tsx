import { Button, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import type { Assignment } from "../../types/domain";
import { StatusBadge } from "../ui/StatusBadge";

interface AssignmentCardProps {
  assignment: Assignment;
  studentName: string;
  onComplete: (id: string) => void;
}
const colors: Record<Assignment["tone"], string> = {
  navy: "dark",
  coral: "red",
  sky: "blue",
  indigo: "indigo",
  blue: "blue",
  purple: "violet",
  orange: "orange",
  teal: "teal",
};
export function AssignmentCard({ assignment, studentName, onComplete }: AssignmentCardProps) {
  return (
    <Card withBorder padding="lg" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group justify="space-between">
          <ThemeIcon color={colors[assignment.tone]} variant="light" radius="xl">
            ●
          </ThemeIcon>
          <StatusBadge status={assignment.status} />
        </Group>
        <div>
          <Text c="dimmed" fw={700} size="xs">
            {assignment.subject} · {studentName}
          </Text>
          <Text fw={800} mt={4}>
            {assignment.title}
          </Text>
          <Text c="dimmed" size="sm" mt={6}>
            {assignment.description}
          </Text>
        </div>
        <Stack gap={4} mt="auto">
          <Text c="dimmed" size="xs">
            ◷ {assignment.dueLabel}
          </Text>
          <Text c="dimmed" size="xs">
            ◉ {assignment.teacher}
          </Text>
        </Stack>
        {assignment.status === "לביצוע" ? (
          <Button color="teal" variant="light" onClick={() => onComplete(assignment.id)}>
            סימון כהושלם
          </Button>
        ) : (
          <Button variant="subtle">לפרטים ←</Button>
        )}
      </Stack>
    </Card>
  );
}
