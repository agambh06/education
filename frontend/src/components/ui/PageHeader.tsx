import { Box, Flex, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <Flex
      direction={{ base: "column", sm: "row" }}
      justify="space-between"
      align={{ base: "stretch", sm: "center" }}
      gap="md"
      mb="xl"
    >
      <Box flex={1} miw={0} style={{ overflowWrap: "anywhere" }}>
        <Text c="dimmed" fw={800} size="xs" tt="uppercase" mb={4}>
          {eyebrow}
        </Text>
        <Title order={1} fz={{ base: 24, sm: 28 }}>
          {title}
        </Title>
        {description && (
          <Text c="dimmed" mt={6}>
            {description}
          </Text>
        )}
      </Box>
      {action}
    </Flex>
  );
}
