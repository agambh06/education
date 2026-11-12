import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { StatCard } from "../../components/dashboard/StatCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { useParentProgress } from "../../hooks/useParentProgress";
import type { ParentExamProgress, ParentLearningProgress } from "../../types/parentProgress";
import { parentStrings } from "./strings";

const strings = parentStrings.dashboard;
const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "Asia/Jerusalem" });

export function ParentDashboardPage() {
  const state = useParentProgress();
  return <ParentProgressDashboard state={state} />;
}

export function ParentProgressDashboard({ state }: { state: ReturnType<typeof useParentProgress> }) {
  const selectedChild = state.children.find((child) => child.id === state.selectedChildId);
  // Never render stale or mismatched data, even during a child or access transition.
  const progress =
    state.status === "ready" && selectedChild && state.progress?.childId === selectedChild.id ? state.progress : null;
  return (
    <Stack gap="lg" dir="rtl">
      <PageHeader eyebrow={strings.eyebrow} title={strings.title} description={strings.description} />
      {state.mode === "demo" ? (
        <Alert color="orange" title={strings.demoTitle}>
          <Stack gap="sm">
            <Text size="sm">{strings.demoDescription}</Text>
            <Button variant="outline" color="orange" onClick={state.exitDemo} size="sm" w="fit-content">
              {strings.exitDemo}
            </Button>
          </Stack>
        </Alert>
      ) : null}
      <Group justify="space-between" align="flex-end">
        {state.children.length > 0 && (state.status === "ready" || state.status === "loading") ? (
          <Select
            label={state.mode === "demo" ? strings.demoChildLabel : strings.childLabel}
            value={state.selectedChildId}
            onChange={(id) => {
              if (id) state.selectChild(id);
            }}
            data={state.children.map((child) => ({ value: child.id, label: `${child.firstName} ${child.lastName}` }))}
            allowDeselect={false}
            w={{ base: "100%", sm: 280 }}
          />
        ) : null}
        <Button variant="light" onClick={state.refresh} disabled={state.status === "loading"}>
          {strings.refresh}
        </Button>
      </Group>
      <Alert color="indigo" title={strings.privacyTitle}>
        {strings.privacyDescription}
      </Alert>
      <Box aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "loading" ? (
          <Group role="status" py="xl" justify="center">
            <Loader size="sm" aria-hidden="true" />
            <Text>{strings.loading}</Text>
          </Group>
        ) : state.status !== "ready" ? (
          <DashboardNotice status={state.status} />
        ) : progress ? (
          <LearningSummary progress={progress} demo={state.mode === "demo"} />
        ) : null}
      </Box>
      {state.mode === "live" && state.status !== "loading" ? (
        <Button variant="subtle" onClick={state.startDemo} w="fit-content">
          {strings.demoAction}
        </Button>
      ) : null}
    </Stack>
  );
}

function DashboardNotice({ status }: { status: "unlinked" | "denied" | "unavailable" | "error" }) {
  const notices = {
    unlinked: { title: strings.unlinkedTitle, description: strings.unlinkedDescription },
    denied: { title: strings.deniedTitle, description: strings.deniedDescription },
    unavailable: { title: strings.unavailableTitle, description: strings.unavailableDescription },
    error: { title: strings.errorTitle, description: strings.errorDescription },
  };
  const notice = notices[status];
  return (
    <Alert color={status === "denied" ? "red" : "gray"} title={notice.title}>
      {notice.description}
    </Alert>
  );
}

function LearningSummary({ progress, demo }: { progress: ParentLearningProgress; demo: boolean }) {
  const [snapshotTime] = useState(() => Date.now());
  const { activity } = progress;
  const upcomingExams = progress.exams
    .filter((exam) => Date.parse(exam.scheduledAt) >= snapshotTime)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const reviewTopics = upcomingExams.flatMap((exam) =>
    exam.topics.filter((topic) => topic.needsReview).map((topic) => ({ exam, topic })),
  );
  return (
    <Stack gap="lg">
      <Badge variant="light" color={demo ? "orange" : "teal"}>
        {demo ? strings.demoTitle : strings.recordedData}
      </Badge>
      <Box component="section">
        <Title order={2} fz="h3" mb="xs">
          {strings.activityHeading}
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          {strings.activityNote}
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
          <StatCard icon="◷" tone="blue" value={String(activity.sessionCount)} label={strings.sessions} note="" />
          <StatCard icon="✓" tone="teal" value={String(activity.questionCount)} label={strings.questions} note="" />
          <StatCard icon="◴" tone="purple" value={String(activity.practiceMinutes)} label={strings.minutes} note="" />
          <StatCard
            icon="▣"
            tone="orange"
            value={
              activity.lastPracticedAt ? dateFormat.format(new Date(activity.lastPracticedAt)) : strings.noLastPractice
            }
            label={strings.lastPracticed}
            note=""
          />
        </SimpleGrid>
      </Box>
      {activity.sessionCount === 0 ? (
        <Alert color="gray" title={strings.noActivityTitle}>
          {strings.noActivityDescription}
        </Alert>
      ) : null}
      <Alert color="blue" title={strings.coverage}>
        {strings.coverageLimitation}
      </Alert>
      <Box component="section">
        <Title order={2} fz="h3" mb="md">
          {strings.examsHeading}
        </Title>
        {upcomingExams.length === 0 ? (
          <Text c="dimmed">{strings.noExams}</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            {upcomingExams.map((exam) => (
              <ExamSummary key={exam.id} exam={exam} />
            ))}
          </SimpleGrid>
        )}
      </Box>
      <Paper component="section" withBorder p="lg" radius="md">
        <Title order={2} fz="h3" mb="md">
          {strings.reviewHeading}
        </Title>
        {reviewTopics.length === 0 ? (
          <Text size="sm" c="dimmed">
            {strings.noReview}
          </Text>
        ) : (
          <Stack gap="xs">
            {reviewTopics.map(({ exam, topic }) => (
              <Group key={`${exam.id}-${topic.id}`} justify="space-between">
                <Box>
                  <Text fw={600}>{topic.title}</Text>
                  <Text size="sm" c="dimmed">
                    {exam.subject} · {exam.title}
                  </Text>
                </Box>
                <Badge color="orange" variant="light">
                  {strings.review}
                </Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

function ExamSummary({ exam }: { exam: ParentExamProgress }) {
  const practicedCount = exam.topics.filter((topic) => topic.practiceCount > 0).length;
  const coverage = exam.topics.length > 0 ? Math.round((practicedCount / exam.topics.length) * 100) : null;
  return (
    <Paper component="article" withBorder p="lg" radius="md">
      <Stack gap="md">
        <Box>
          <Group justify="space-between" mb="xs">
            <Badge color="indigo" variant="light">
              {exam.subject}
            </Badge>
            <Text component="time" dateTime={exam.scheduledAt} size="sm" c="dimmed">
              {dateFormat.format(new Date(exam.scheduledAt))}
            </Text>
          </Group>
          <Title order={3} fz="h4">
            {exam.title}
          </Title>
        </Box>
        <Box>
          <Text size="sm" fw={600} mb={6}>
            {coverage === null ? strings.unknownCoverage : `${strings.coverage}: ${coverage}%`}
          </Text>
          {coverage !== null ? <Progress value={coverage} aria-label={strings.coverage} /> : null}
          <Text size="xs" c="dimmed" mt={6}>
            {strings.topicCount(practicedCount, exam.topics.length)}
          </Text>
        </Box>
        <Text fw={600} size="sm">
          {strings.topicsPracticed}
        </Text>
        {exam.topics.length === 0 ? <Text size="sm">{strings.noTopics}</Text> : null}
        {exam.topics.map((topic) => (
          <Group key={topic.id} justify="space-between" align="flex-start">
            <Box>
              <Text size="sm" fw={600}>
                {topic.title}
              </Text>
              {topic.practiceCount > 0 ? (
                <Text size="xs" c="dimmed">
                  {strings.practiceCount(topic.practiceCount)}
                </Text>
              ) : null}
            </Box>
            <Badge color={topic.needsReview ? "orange" : topic.practiceCount > 0 ? "teal" : "gray"} variant="light">
              {topic.needsReview ? strings.review : topic.practiceCount > 0 ? strings.practiced : strings.notPracticed}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
