import { Avatar, Box, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
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
        action={<Button>{parentStrings.messages.newMessage}</Button>}
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
                  מתמטיקה · נועה כהן
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
              <Text size="sm">תודה, נדאג לסיים את המשימה הערב.</Text>
            </Paper>
            <Group mt="auto">
              <TextInput placeholder={parentStrings.messages.compose} style={{ flex: 1 }} />
              <Button>↑</Button>
            </Group>
          </Stack>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
