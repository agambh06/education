import { Alert, Badge, Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import type { Exam } from "../../types/domain";
import { parentStrings } from "./strings";

interface Props {
  exams: Exam[];
  loading: boolean;
  error: boolean;
  studentName?: string;
}

export function ExamsPage({ exams, loading, error, studentName }: Props) {
  const strings = parentStrings.exams;
  return (
    <Stack gap="lg">
      <PageHeader {...strings} />
      {loading ? (
        <Stack aria-label={strings.loading}>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </Stack>
      ) : error ? (
        <Alert color="red" role="alert">
          {strings.error}
        </Alert>
      ) : exams.length === 0 ? (
        <Paper withBorder p="lg">
          <Text c="dimmed">{strings.empty}</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          {exams.map((exam) => (
            <Group
              key={exam.id}
              justify="space-between"
              p="lg"
              wrap="nowrap"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
            >
              <Group wrap="nowrap">
                <Badge variant="light">{exam.subject}</Badge>
                <Box>
                  <Text fw={700}>{exam.title}</Text>
                  <Text c="dimmed" size="sm">
                    {studentName ? strings.student(studentName) : `${strings.class} ${exam.classId}`}
                  </Text>
                  {exam.topics.length > 0 && (
                    <Text c="dimmed" size="sm">
                      {exam.topics.join(" · ")}
                    </Text>
                  )}
                </Box>
              </Group>
            </Group>
          ))}
        </Paper>
      )}
    </Stack>
  );
}
