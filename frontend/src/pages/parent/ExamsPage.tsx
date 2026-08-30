import { Badge, Box, Button, Card, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import { exams } from "../../data/mockData";
import { parentStrings } from "./strings";
export function ExamsPage() {
  return (
    <Stack gap="lg">
      <PageHeader {...parentStrings.exams} />
      <Card bg="violet.7" c="white" radius="lg" padding="xl">
        <Group justify="space-between">
          <Box>
            <Badge color="violet.1" c="violet.9">
              {parentStrings.exams.inTwoDays}
            </Badge>
            <Title order={2} mt="md">
              מדעים: מערכת השמש
            </Title>
            <Text c="violet.1" mt="xs">
              נועה · כיתה ו׳1 · המורה רובין
            </Text>
            <Text mt="lg">◷ יום ד׳, 13 במרץ　 ◴ 10:30　 ⌂ חדר 204</Text>
            <Button color="white" c="violet.8" mt="lg">
              {parentStrings.exams.studyMaterials}
            </Button>
          </Box>
          <Text fz={120} opacity={0.2}>
            ◉
          </Text>
        </Group>
      </Card>
      <Paper withBorder radius="md">
        {exams.map((exam) => (
          <Group
            key={exam.id}
            justify="space-between"
            p="lg"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Group>
              <Text fw={800} fz="xl">
                {exam.dateLabel.split(" ")[0]}
              </Text>
              <Box>
                <Text c="dimmed" size="xs">
                  {exam.subject} · נועה כהן
                </Text>
                <Text fw={700}>{exam.title}</Text>
                <Text c="dimmed" size="sm">
                  {exam.teacher} · {exam.time}
                </Text>
              </Box>
            </Group>
            <Button variant="light">{parentStrings.exams.materials}</Button>
          </Group>
        ))}
      </Paper>
    </Stack>
  );
}
