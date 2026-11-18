import { Alert, Badge, Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import type { Exam } from "../../types/domain";
import { parentStrings } from "./strings";

interface Props {
  exams: Exam[];
  loading: boolean;
  error: boolean;
}

export function ExamsPage({ exams, loading, error }: Props) {
  const strings = parentStrings.exams;
  return (
    <Stack gap="lg" miw={0}>
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
                  {exam.classId && (
                    <Text c="dimmed" size="sm">
                      {strings.class} {exam.classId}
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
