import { Box, Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  action?: ReactNode;
}
export function PageHeader({ eyebrow, title, titleIcon, description, action }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="center" mb="xl" wrap="wrap">
      <Box>
        <Text c="dimmed" fw={800} size="xs" tt="uppercase" mb={4}>
          {eyebrow}
        </Text>
        <Group gap="xs">
          <Title order={1} fz={{ base: 24, sm: 28 }}>
            {title}
          </Title>
          {titleIcon}
        </Group>
        {description && (
          <Text c="dimmed" mt={6}>
            {description}
          </Text>
        )}
      </Box>
      {action}
    </Group>
  );
}
