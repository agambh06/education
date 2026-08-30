import { Badge, Button, Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import { commonStrings } from "../../shared/strings/common";
import type { Assignment, Exam } from "../../types/domain";
import { studentStrings } from "./strings";

interface Props {
  assignments: Assignment[];
  exams: Exam[];
  onComplete: (id: string) => void;
}
export function StudentDashboardPage({ assignments, exams, onComplete }: Props) {
  const completed = assignments.filter((item) => item.status === commonStrings.completed).length;
  return (
    <Stack>
      <PageHeader
        eyebrow={studentStrings.eyebrow}
        title={studentStrings.title}
        description={studentStrings.completionSummary(completed, assignments.length)}
      />
      <Paper withBorder p="lg">
        <Title order={2} fz="h3">
          {studentStrings.taskHeading}
        </Title>
        <Stack mt="md">
          {assignments.map((item) => (
            <Group key={item.id} justify="space-between">
              <div>
                <Badge color={item.status === "הושלם" ? "teal" : "blue"}>{item.subject}</Badge>
                <Text fw={700}>{item.title}</Text>
                <Text c="dimmed" size="sm">
                  {item.dueLabel}
                </Text>
              </div>
              {item.status === "לביצוע" && (
                <Button variant="light" onClick={() => onComplete(item.id)}>
                  {commonStrings.done}
                </Button>
              )}
            </Group>
          ))}
        </Stack>
      </Paper>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Paper withBorder p="lg">
          <Title order={2} fz="h3">
            {studentStrings.parentTaskHeading}
          </Title>
          <Text fw={700} mt="md">
            {studentStrings.parentTask}
          </Text>
          <Text c="dimmed" size="sm">
            היום · 18:00 · 20 דקות
          </Text>
          <Button variant="light" mt="md">
            {commonStrings.done}
          </Button>
        </Paper>
        <Paper withBorder p="lg">
          <Title order={2} fz="h3">
            {studentStrings.upcomingExams}
          </Title>
          {exams.slice(0, 1).map((exam) => (
            <Stack key={exam.id} mt="md">
              <Text fw={700}>
                {exam.subject}: {exam.title}
              </Text>
              <Progress value={60} />
              <Text c="dimmed" size="sm">
                {studentStrings.preparation}
              </Text>
            </Stack>
          ))}
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
