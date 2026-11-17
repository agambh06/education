import { Badge, Box, Button, Card, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconCalendarEvent, IconClock, IconMapPin, IconTarget } from "@tabler/icons-react";
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
              {parentStrings.exams.featuredTitle}
            </Title>
            <Text c="violet.1" mt="xs">
              {parentStrings.exams.featuredDetails}
            </Text>
            <Group mt="lg" gap="lg">
              <Group gap={6}>
                <IconCalendarEvent size={16} stroke={1.75} aria-hidden="true" />
                <Text>{parentStrings.exams.featuredDate}</Text>
              </Group>
              <Group gap={6}>
                <IconClock size={16} stroke={1.75} aria-hidden="true" />
                <Text>{parentStrings.exams.featuredTime}</Text>
              </Group>
              <Group gap={6}>
                <IconMapPin size={16} stroke={1.75} aria-hidden="true" />
                <Text>{parentStrings.exams.featuredLocation}</Text>
              </Group>
            </Group>
            <Button
              color="white"
              c="violet.8"
              mt="lg"
              rightSection={<IconArrowLeft size={18} stroke={1.75} aria-hidden="true" />}
            >
              {parentStrings.exams.studyMaterials}
            </Button>
          </Box>
          <Box opacity={0.2}>
            <IconTarget size={120} stroke={1.75} aria-hidden="true" />
          </Box>
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
                  {exam.subject} · {parentStrings.exams.studentName}
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
