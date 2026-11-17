import { Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconChalkboard, IconChecklist, IconMail, IconUsers } from "@tabler/icons-react";
import { StatCard } from "../../components/dashboard/StatCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { adminStrings } from "./strings";
export function AdminDashboardPage() {
  return (
    <Stack>
      <PageHeader eyebrow={adminStrings.eyebrow} title={adminStrings.title} description={adminStrings.description} />
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        <StatCard
          icon={<IconUsers size={20} stroke={1.75} aria-hidden="true" />}
          tone="blue"
          value="486"
          label={adminStrings.stats.students.label}
          note={adminStrings.stats.students.note}
        />
        <StatCard
          icon={<IconChalkboard size={20} stroke={1.75} aria-hidden="true" />}
          tone="purple"
          value="42"
          label={adminStrings.stats.teachers.label}
          note={adminStrings.stats.teachers.note}
        />
        <StatCard
          icon={<IconChecklist size={20} stroke={1.75} aria-hidden="true" />}
          tone="orange"
          value="27"
          label={adminStrings.stats.assignments.label}
          note={adminStrings.stats.assignments.note}
        />
        <StatCard
          icon={<IconMail size={20} stroke={1.75} aria-hidden="true" />}
          tone="teal"
          value="18"
          label={adminStrings.stats.messages.label}
          note={adminStrings.stats.messages.note}
        />
      </SimpleGrid>
      <Paper withBorder p="lg">
        <Title order={2} fz="h3">
          {adminStrings.activityHeading}
        </Title>
        <Text c="dimmed" mt="xs">
          {adminStrings.activityDescription}
        </Text>
      </Paper>
    </Stack>
  );
}
