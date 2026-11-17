import { Button, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
  IconCalendarEvent,
  IconChecklist,
  IconHandStop,
  IconMail,
  IconPlus,
  IconSchool,
  IconSpeakerphone,
} from "@tabler/icons-react";
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
        titleIcon={<IconHandStop size={26} stroke={1.75} aria-hidden="true" />}
        description={teacherStrings.description}
        action={
          <Button onClick={onCreate} leftSection={<IconPlus size={18} stroke={1.75} aria-hidden="true" />}>
            {teacherStrings.newAssignment}
          </Button>
        }
      />
      <Paper bg="dark.8" c="white" p="lg" radius="md">
        <Title order={2} fz="h3">
          {teacherStrings.quickActionHeading}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
          <Button
            variant="light"
            color="gray"
            onClick={onCreate}
            leftSection={<IconPlus size={18} stroke={1.75} aria-hidden="true" />}
          >
            {teacherStrings.newAssignment}
          </Button>
          <Button
            variant="light"
            color="gray"
            leftSection={<IconCalendarEvent size={18} stroke={1.75} aria-hidden="true" />}
          >
            {teacherStrings.newExam}
          </Button>
          <Button
            variant="light"
            color="gray"
            leftSection={<IconSpeakerphone size={18} stroke={1.75} aria-hidden="true" />}
          >
            {teacherStrings.newAnnouncement}
          </Button>
        </SimpleGrid>
      </Paper>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        <StatCard
          icon={<IconSchool size={20} stroke={1.75} aria-hidden="true" />}
          tone="blue"
          value="4"
          label={teacherStrings.stats.classes.label}
          note={teacherStrings.stats.classes.note}
        />
        <StatCard
          icon={<IconChecklist size={20} stroke={1.75} aria-hidden="true" />}
          tone="orange"
          value="5"
          label={teacherStrings.stats.assignments.label}
          note={teacherStrings.stats.assignments.note}
        />
        <StatCard
          icon={<IconCalendarEvent size={20} stroke={1.75} aria-hidden="true" />}
          tone="purple"
          value="2"
          label={teacherStrings.stats.exams.label}
          note={teacherStrings.stats.exams.note}
        />
        <StatCard
          icon={<IconMail size={20} stroke={1.75} aria-hidden="true" />}
          tone="teal"
          value="3"
          label={teacherStrings.stats.messages.label}
          note={teacherStrings.stats.messages.note}
        />
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
