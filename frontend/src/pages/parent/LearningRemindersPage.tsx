import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { type LearningReminderStatus, learningRemindersService } from "../../services/learningRemindersService";
import { learningReminderStrings as strings } from "./learningReminderStrings";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; data: LearningReminderStatus };

export function LearningRemindersPage() {
  const [attempt, setAttempt] = useState(0);

  return (
    <Stack gap="lg">
      <PageHeader {...strings.header} />
      <ReminderStatus key={attempt} onRetry={() => setAttempt((value) => value + 1)} />
    </Stack>
  );
}

function ReminderStatus({ onRetry }: { onRetry: () => void }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    learningRemindersService.getStatus(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setLoadState({ status: "ready", data });
      },
      () => {
        if (!controller.signal.aborted) setLoadState({ status: "error" });
      },
    );
    return () => controller.abort();
  }, []);

  if (loadState.status === "loading") {
    return (
      <Group role="status">
        <Loader size="sm" aria-hidden="true" />
        <Text>{strings.loading}</Text>
      </Group>
    );
  }

  if (loadState.status === "error") {
    return (
      <Alert color="red" title={strings.errorTitle} role="alert">
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{strings.errorDescription}</Text>
          <Button variant="light" color="red" onClick={onRetry}>
            {strings.retry}
          </Button>
        </Stack>
      </Alert>
    );
  }

  return <ReminderSettings status={loadState.data} />;
}

function ReminderSettings({ status }: { status: LearningReminderStatus }) {
  const { defaults, policy } = status;
  const deliveryWindow = `${String(policy.windowStartHour).padStart(2, "0")}:00–${String(policy.windowEndHour).padStart(2, "0")}:00`;
  const policyItems = [
    { label: strings.timeZone, value: defaults.timeZone },
    { label: strings.deliveryWindow, value: deliveryWindow },
    { label: strings.childCooldown, value: strings.days(policy.childCooldownDays) },
    { label: strings.parentWeeklyLimit, value: strings.reminders(policy.parentWeeklyLimit) },
  ];

  return (
    <>
      <Alert color="blue" title={strings.unavailableTitle}>
        <Text size="sm">{status.settingsAvailable ? strings.missingContext : strings.unavailableDescription}</Text>
      </Alert>
      {status.blockedBy.length > 0 && (
        <Paper withBorder p="lg" radius="md">
          <Title order={2} size="h4" mb="sm">
            {strings.blockersTitle}
          </Title>
          <List spacing="xs" size="sm">
            {status.blockedBy.map((blocker) => (
              <List.Item key={blocker}>{strings.blockers[blocker]}</List.Item>
            ))}
          </List>
        </Paper>
      )}
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Title order={2} size="h4">
            {strings.defaultsTitle}
          </Title>
          <Text size="sm" c="dimmed">
            {strings.defaultsDescription}
          </Text>
          <Switch
            checked={defaults.upcomingExams}
            disabled
            label={strings.upcomingExams}
            description={strings.upcomingExamsDescription}
          />
          <Switch
            checked={defaults.lowActivity}
            disabled
            label={strings.lowActivity}
            description={strings.lowActivityDescription}
          />
          <Text size="sm">{strings.disabledControls}</Text>
        </Stack>
      </Paper>
      <Paper withBorder p="lg" radius="md">
        <Title order={2} size="h4" mb="md">
          {strings.policyTitle}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {policyItems.map((item) => (
            <Stack key={item.label} gap="xs">
              <Text size="sm" c="dimmed">
                {item.label}
              </Text>
              <Text fw={600} style={{ unicodeBidi: "plaintext" }}>
                {item.value}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Paper>
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Title order={2} size="h4">
            {strings.privacyTitle}
          </Title>
          <Text size="sm">{strings.privacyDescription}</Text>
          <Badge variant="light" size="lg" style={{ height: "auto", whiteSpace: "normal" }}>
            {strings.previewLabel}
          </Badge>
          <Text size="sm">{strings.previewMessage}</Text>
          <Text size="sm" c="dimmed">
            {strings.interpretation}
          </Text>
        </Stack>
      </Paper>
    </>
  );
}
