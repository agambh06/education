import { Button, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { StatCard } from "../../components/dashboard/StatCard";
import { PageHeader } from "../../components/ui/PageHeader";
import type { SchoolClass } from "../../types/domain";
import { teacherStrings } from "./strings";

interface Props {
  classes: SchoolClass[];
  onCreate: () => void;
}
export function TeacherDashboardPage({ classes, onCreate }: Props) {
  return (
    <Stack>
      <PageHeader
        eyebrow={teacherStrings.eyebrow}
        title={teacherStrings.title}
        description={teacherStrings.description}
        action={<Button onClick={onCreate}>{teacherStrings.newAssignment}</Button>}
      />
      <Paper bg="dark.8" c="white" p="lg" radius="md">
        <Title order={2} fz="h3">
          {teacherStrings.quickActionHeading}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
          <Button variant="light" color="gray" onClick={onCreate}>
            {teacherStrings.newAssignment}
          </Button>
          <Button variant="light" color="gray">
            {teacherStrings.newExam}
          </Button>
          <Button variant="light" color="gray">
            {teacherStrings.newAnnouncement}
          </Button>
        </SimpleGrid>
      </Paper>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        <StatCard icon="▣" tone="blue" value="4" label="כיתות" note="112 תלמידים" />
        <StatCard icon="✓" tone="orange" value="5" label="משימות קרובות" note="2 ממתינות לפרסום" />
        <StatCard icon="◉" tone="purple" value="2" label="מבחנים קרובים" note="החודש" />
        <StatCard icon="✉" tone="teal" value="3" label="הודעות חדשות" note="מאז יום שישי" />
      </SimpleGrid>
      <Paper withBorder p="lg">
        <Title order={2} fz="h3">
          {teacherStrings.classesHeading}
        </Title>
        <Stack mt="md">
          {classes.map((item) => (
            <Paper key={item.id} withBorder p="sm">
              <Text fw={700}>{item.name}</Text>
              <Text c="dimmed" size="sm">
                {item.studentCount} תלמידים
              </Text>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
