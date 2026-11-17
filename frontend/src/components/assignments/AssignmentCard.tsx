import { Button, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowLeft, IconBook2, IconClock, IconUser } from "@tabler/icons-react";
import { commonStrings } from "../../shared/strings/common";
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
            <IconBook2 size={20} stroke={1.75} aria-hidden="true" />
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
          <Group gap={6} c="dimmed">
            <IconClock size={16} stroke={1.75} aria-hidden="true" />
            <Text size="xs">{assignment.dueLabel}</Text>
          </Group>
          <Group gap={6} c="dimmed">
            <IconUser size={16} stroke={1.75} aria-hidden="true" />
            <Text size="xs">{assignment.teacher}</Text>
          </Group>
        </Stack>
        {assignment.status === "לביצוע" ? (
          <Button color="teal" variant="light" onClick={() => onComplete(assignment.id)}>
            {commonStrings.markComplete}
          </Button>
        ) : (
          <Button variant="subtle" rightSection={<IconArrowLeft size={18} stroke={1.75} aria-hidden="true" />}>
            {commonStrings.details}
          </Button>
        )}
      </Stack>
    </Card>
  );
}
