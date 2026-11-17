import { Badge, Box, Button, Card, Flex, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import { exams } from "../../data/mockData";
import { parentStrings } from "./strings";
export function ExamsPage() {
  return (
    <Stack gap="lg" miw={0}>
      <PageHeader {...parentStrings.exams} />
      <Card bg="violet.7" c="white" radius="lg" p={{ base: "md", sm: "xl" }}>
        <Group justify="space-between" wrap="nowrap">
          <Box miw={0}>
            <Badge color="violet.1" c="violet.9">
              {parentStrings.exams.inTwoDays}
            </Badge>
            <Title order={2} mt="md">
              מדעים: מערכת השמש
            </Title>
            <Text c="violet.1" mt="xs">
              נועה · כיתה ו׳1 · המורה רובין
            </Text>
            <Text mt="lg" style={{ overflowWrap: "anywhere" }}>
              ◷ יום ד׳, 13 במרץ　 ◴ 10:30　 ⌂ חדר 204
            </Text>
            <Button color="white" c="violet.8" mt="lg" mih={{ base: 44, sm: 36 }} w={{ base: "100%", xs: "auto" }}>
              {parentStrings.exams.studyMaterials}
            </Button>
          </Box>
          <Text fz={120} opacity={0.2} visibleFrom="sm" aria-hidden style={{ flexShrink: 0 }}>
            ◉
          </Text>
        </Group>
      </Card>
      <Paper withBorder radius="md">
        {exams.map((exam) => (
          <Flex
            key={exam.id}
            direction={{ base: "column", xs: "row" }}
            align={{ base: "stretch", xs: "center" }}
            justify="space-between"
            gap="md"
            p={{ base: "md", sm: "lg" }}
            style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Group wrap="nowrap" miw={0}>
              <Text fw={800} fz="xl" style={{ flexShrink: 0 }}>
                {exam.dateLabel.split(" ")[0]}
              </Text>
              <Box miw={0}>
                <Text c="dimmed" size="xs">
                  {exam.subject} · נועה כהן
                </Text>
                <Text fw={700}>{exam.title}</Text>
                <Text c="dimmed" size="sm">
                  {exam.teacher} · {exam.time}
                </Text>
              </Box>
            </Group>
            <Button variant="light" mih={{ base: 44, sm: 36 }} style={{ flexShrink: 0 }}>
              {parentStrings.exams.materials}
            </Button>
          </Flex>
        ))}
      </Paper>
    </Stack>
  );
}
