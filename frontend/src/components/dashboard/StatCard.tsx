import { Group, Paper, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";
import type { ColorTone } from "../../types/domain";

interface StatCardProps {
  icon: ReactNode;
  tone: ColorTone;
  value: string;
  label: string;
  note: string;
}
const colors: Partial<Record<ColorTone, string>> = { orange: "orange", purple: "violet", blue: "blue", teal: "teal" };
export function StatCard({ icon, tone, value, label, note }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md" h="100%" miw={0}>
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" color={colors[tone] ?? "indigo"} size="lg" radius="md" aria-hidden="true">
          {icon}
        </ThemeIcon>
        <Box miw={0} style={{ overflowWrap: "anywhere" }}>
          <Text fw={800} size="xl">
            {value}
          </Text>
          <Text fw={700} size="sm">
            {label}
          </Text>
          <Text c="dimmed" size="xs">
            {note}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
}
