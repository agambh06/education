import { Avatar, Box, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus, IconSend } from "@tabler/icons-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { messages } from "../../data/mockData";
import { parentStrings } from "./strings";
export function MessagesPage() {
  const active = messages[0];
  return (
    <Stack>
      <PageHeader
        eyebrow={parentStrings.messages.eyebrow}
        title={parentStrings.messages.title}
        description={parentStrings.messages.description}
        action={
          <Button leftSection={<IconPlus size={18} stroke={1.75} aria-hidden="true" />}>
            {parentStrings.messages.newMessage}
          </Button>
        }
      />
      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <Stack>
            <TextInput placeholder={parentStrings.messages.search} />
            {messages.map((message) => (
              <Button
                key={message.id}
                variant={message.id === active.id ? "light" : "subtle"}
                justify="flex-start"
                h="auto"
                py="sm"
              >
                <Group>
                  <Avatar color="blue" radius="xl">
                    {message.initials}
                  </Avatar>
                  <Box ta="right">
                    <Text fw={700} size="sm">
                      {message.teacher}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {message.preview}
                    </Text>
                  </Box>
                </Group>
              </Button>
            ))}
          </Stack>
          <Stack gap="md" style={{ gridColumn: "span 2" }}>
            <Group>
              <Avatar color="red" radius="xl">
                {active.initials}
              </Avatar>
              <Box>
                <Text fw={700}>{active.teacher}</Text>
                <Text c="dimmed" size="xs">
                  {parentStrings.messages.conversationDetails}
                </Text>
              </Box>
            </Group>
            <Paper bg="gray.1" p="sm" radius="md" maw={480}>
              <Text size="sm">{active.body}</Text>
              <Text c="dimmed" size="xs" mt={4}>
                {active.sentAt}
              </Text>
            </Paper>
            <Paper bg="indigo.6" c="white" p="sm" radius="md" maw={400} ms="auto">
              <Text size="sm">{parentStrings.messages.sampleReply}</Text>
            </Paper>
            <Group mt="auto">
              <TextInput placeholder={parentStrings.messages.compose} style={{ flex: 1 }} />
              <Button aria-label={parentStrings.messages.send}>
                <IconSend size={18} stroke={1.75} aria-hidden="true" />
              </Button>
            </Group>
          </Stack>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
