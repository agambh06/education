import { Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { StatCard } from "../../components/dashboard/StatCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { adminStrings } from "./strings";
export function AdminDashboardPage() {
  return (
    <Stack>
      <PageHeader eyebrow={adminStrings.eyebrow} title={adminStrings.title} description={adminStrings.description} />
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        <StatCard icon="◉" tone="blue" value="486" label="תלמידים פעילים" note="ב-18 כיתות" />
        <StatCard icon="♧" tone="purple" value="42" label="צוות הוראה" note="כל החשבונות פעילים" />
        <StatCard icon="✓" tone="orange" value="27" label="פריטים להגשה השבוע" note="בכל הכיתות" />
        <StatCard icon="✉" tone="teal" value="18" label="הודעות מהורים" note="ממתינות למענה" />
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
