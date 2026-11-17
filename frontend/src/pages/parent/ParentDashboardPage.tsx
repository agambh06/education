import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { StatCard } from "../../components/dashboard/StatCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { ALL_STUDENTS_ID } from "../../constants/app";
import { commonStrings } from "../../shared/strings/common";
import type { Assignment, Student } from "../../types/domain";
import { parentStrings } from "./strings";

interface Props {
  students: Student[];
  selectedStudentId: string;
  assignments: Assignment[];
  onStudentChange: (id: string) => void;
}
export function ParentDashboardPage({ students, selectedStudentId, assignments, onStudentChange }: Props) {
  const selected = students.find((student) => student.id === selectedStudentId);
  const toDo = assignments.filter((item) => item.status === commonStrings.toDo).length;
  return (
    <Stack gap="lg" miw={0}>
      <PageHeader
        eyebrow={parentStrings.dashboard.eyebrow}
        title={parentStrings.dashboard.title}
        description={parentStrings.dashboard.description}
        action={
          <Select
            w={{ base: "100%", xs: 220 }}
            value={selectedStudentId}
            onChange={(value) => onStudentChange(value ?? ALL_STUDENTS_ID)}
            data={[
              { value: ALL_STUDENTS_ID, label: commonStrings.allChildren },
              ...students.map((student) => ({ value: student.id, label: `${student.firstName} ${student.lastName}` })),
            ]}
            leftSection={
              <Avatar color={selected?.tone === "coral" ? "red" : "blue"} radius="xl">
                {selected?.initials ?? "נ״ד"}
              </Avatar>
            }
          />
        }
      />
      <Alert color="orange" title={parentStrings.dashboard.attentionTitle} withCloseButton>
        {parentStrings.dashboard.attentionDescription}
      </Alert>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
        <StatCard icon="✓" tone="orange" value={String(toDo)} label="משימות לביצוע" note="אחת להגשה מחר" />
        <StatCard icon="▣" tone="purple" value="2" label="מבחנים קרובים" note="הבא בעוד יומיים" />
        <StatCard icon="✉" tone="blue" value="2" label="הודעות שלא נקראו" note="מהמורה לוי" />
        <StatCard icon="◷" tone="teal" value="4" label="אירועים קרובים" note="השבוע" />
      </SimpleGrid>
      <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
        <SectionHeader
          title={parentStrings.dashboard.attentionHeading}
          sub={parentStrings.dashboard.attentionSubheading}
        />
        <Stack gap={0}>
          <Attention
            badge="משימה להגשה מחר"
            color="orange"
            title="דף תרגול שברים"
            detail="מתמטיקה · המורה לוי · נועה"
            date="מחר, 09:00"
          />
          <Attention
            badge="משימה באיחור"
            color="red"
            title="תרגול איות"
            detail="עברית · המורה בר · דניאל"
            date="מועד הגשה: 8 במרץ"
          />
          <Attention
            badge="מבחן קרוב"
            color="violet"
            title="מדעים: מערכת השמש"
            detail="מדעים · המורה רובין · נועה"
            date="ד׳, 13 במרץ · 10:30"
          />
        </Stack>
      </Paper>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" miw={0}>
          <SectionHeader
            title={parentStrings.dashboard.upcomingHeading}
            sub={parentStrings.dashboard.upcomingSubheading}
          />
          <Stack gap="md">
            <Schedule date="11" type="שיעורי בית" title="דף תרגול שברים" detail="נועה · מתמטיקה" color="blue" />
            <Schedule date="13" type="מבחן" title="מדעים: מערכת השמש" detail="נועה · 10:30" color="violet" />
            <Schedule
              date="14"
              type="אירוע בית ספרי"
              title="יום קריאה משפחתי"
              detail="כל הילדים · 09:00"
              color="teal"
            />
          </Stack>
        </Paper>
        <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" miw={0}>
          <SectionHeader
            title={parentStrings.dashboard.progressHeading}
            sub={parentStrings.dashboard.progressSubheading}
          />
          <Stack gap="md">
            <ProgressItem child="נועה" detail="3 מתוך 4 הושלמו" value={75} />
            <ProgressItem child="דניאל" detail="2 מתוך 4 הושלמו" value={50} />
          </Stack>
          <Button fullWidth variant="light" mt="lg">
            {parentStrings.dashboard.progressAction}
          </Button>
        </Paper>
      </SimpleGrid>
      <Card withBorder radius="md" p={{ base: "md", sm: "lg" }}>
        <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} gap="md">
          <Group wrap="nowrap" align="flex-start" flex={1} miw={0}>
            <Avatar size="lg" color="indigo" radius="md" style={{ flexShrink: 0 }}>
              ✦
            </Avatar>
            <Box miw={0}>
              <Badge color="blue" variant="light">
                {parentStrings.dashboard.announcementLabel}
              </Badge>
              <Title order={3} mt="xs">
                {parentStrings.dashboard.announcementTitle}
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                {parentStrings.dashboard.announcementText}
              </Text>
            </Box>
          </Group>
          <Button variant="subtle" mih={{ base: 44, sm: 36 }} style={{ flexShrink: 0 }}>
            {parentStrings.dashboard.announcementAction}
          </Button>
        </Flex>
      </Card>
    </Stack>
  );
}
function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <Flex
      direction={{ base: "column", xs: "row" }}
      justify="space-between"
      align={{ base: "flex-start", xs: "center" }}
      gap="xs"
      mb="md"
    >
      <Box miw={0}>
        <Title order={2} fz="h3">
          {title}
        </Title>
        <Text c="dimmed" size="sm">
          {sub}
        </Text>
      </Box>
      <Button variant="subtle" size="sm" mih={{ base: 44, sm: 36 }} style={{ flexShrink: 0 }}>
        {commonStrings.viewAll}
      </Button>
    </Flex>
  );
}
function Attention({
  badge,
  color,
  title,
  detail,
  date,
}: {
  badge: string;
  color: string;
  title: string;
  detail: string;
  date: string;
}) {
  return (
    <Flex
      direction={{ base: "column", xs: "row" }}
      justify="space-between"
      align={{ base: "stretch", xs: "center" }}
      gap="xs"
      py="sm"
      style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
    >
      <Box miw={0}>
        <Badge color={color} variant="light">
          {badge}
        </Badge>
        <Text fw={700} mt={4}>
          {title}
        </Text>
        <Text c="dimmed" size="sm">
          {detail}
        </Text>
      </Box>
      <Flex
        direction={{ base: "row", xs: "column" }}
        justify="space-between"
        align={{ base: "center", xs: "flex-end" }}
        gap={4}
        style={{ flexShrink: 0 }}
      >
        <Text size="xs" fw={700}>
          {date}
        </Text>
        <Button variant="subtle" size="sm" mih={{ base: 44, sm: 36 }}>
          {commonStrings.details}
        </Button>
      </Flex>
    </Flex>
  );
}
function Schedule({
  date,
  type,
  title,
  detail,
  color,
}: {
  date: string;
  type: string;
  title: string;
  detail: string;
  color: string;
}) {
  return (
    <Group wrap="nowrap">
      <Text component="div" fw={800} c={color} w={36} ta="center" style={{ flexShrink: 0 }}>
        {date}
        <Text size="xs" c="dimmed">
          {commonStrings.march}
        </Text>
      </Text>
      <Box miw={0} style={{ borderInlineStart: `3px solid var(--mantine-color-${color}-5)` }} ps="sm">
        <Text c="dimmed" size="xs">
          {type}
        </Text>
        <Text fw={700}>{title}</Text>
        <Text c="dimmed" size="xs">
          {detail}
        </Text>
      </Box>
    </Group>
  );
}
function ProgressItem({ child, detail, value }: { child: string; detail: string; value: number }) {
  return (
    <Box>
      <Group justify="space-between">
        <Text fw={700}>{child}</Text>
        <Text c="dimmed" size="xs">
          {detail}
        </Text>
      </Group>
      <Progress value={value} mt={6} />
    </Box>
  );
}
