import { Avatar, Box, Button, Grid, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import { messages } from "../../data/mockData";
import { parentStrings } from "./strings";
export function MessagesPage() {
  const active = messages[0];
  return (
    <Stack miw={0}>
      <PageHeader
        eyebrow={parentStrings.messages.eyebrow}
        title={parentStrings.messages.title}
        description={parentStrings.messages.description}
        action={<Button mih={{ base: 44, sm: 36 }}>{parentStrings.messages.newMessage}</Button>}
      />
      <Paper withBorder p={{ base: "sm", sm: "md" }} miw={0}>
        <Grid gap={{ base: "lg", sm: "xl" }}>
          <Grid.Col span={{ base: 12, sm: 4 }} miw={0}>
            <Stack>
              <TextInput placeholder={parentStrings.messages.search} />
              {messages.map((message) => (
                <Button
                  key={message.id}
                  variant={message.id === active.id ? "light" : "subtle"}
                  justify="flex-start"
                  fullWidth
                  h="auto"
                  mih={64}
                  py="sm"
                  styles={{ label: { width: "100%", whiteSpace: "normal" } }}
                >
                  <Group wrap="nowrap" gap="sm" miw={0}>
                    <Avatar color="blue" radius="xl" style={{ flexShrink: 0 }}>
                      {message.initials}
                    </Avatar>
                    <Box ta="start" miw={0} flex={1}>
                      <Text fw={700} size="sm">
                        {message.teacher}
                      </Text>
                      <Text c="dimmed" size="xs" lineClamp={2}>
                        {message.preview}
                      </Text>
                    </Box>
                  </Group>
                </Button>
              ))}
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 8 }} miw={0}>
            <Stack gap="md" h="100%" miw={0}>
              <Group wrap="nowrap">
                <Avatar color="red" radius="xl" style={{ flexShrink: 0 }}>
                  {active.initials}
                </Avatar>
                <Box miw={0}>
                  <Text fw={700}>{active.teacher}</Text>
                  <Text c="dimmed" size="xs">
                    מתמטיקה · נועה כהן
                  </Text>
                </Box>
              </Group>
              <Paper bg="gray.1" p="sm" radius="md" maw={480} style={{ overflowWrap: "anywhere" }}>
                <Text size="sm">{active.body}</Text>
                <Text c="dimmed" size="xs" mt={4}>
                  {active.sentAt}
                </Text>
              </Paper>
              <Paper
                bg="indigo.6"
                c="white"
                p="sm"
                radius="md"
                maw={400}
                ms="auto"
                style={{ overflowWrap: "anywhere" }}
              >
                <Text size="sm">תודה, נדאג לסיים את המשימה הערב.</Text>
              </Paper>
              <Group mt="auto" wrap="nowrap" gap="xs">
                <TextInput placeholder={parentStrings.messages.compose} flex={1} miw={0} size="md" />
                <Button aria-label={parentStrings.messages.sendLabel} h={44} miw={44} px="sm" style={{ flexShrink: 0 }}>
                  ↑
                </Button>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}
