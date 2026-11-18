import { Badge, Box, Button, Paper, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import { commonStrings } from "../../shared/strings/common";
import { parentStrings } from "./strings";

const calendarBadgeStyles = { label: { whiteSpace: "normal", overflowWrap: "anywhere" } } as const;

export function CalendarPage() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return (
    <Stack miw={0}>
      <PageHeader
        eyebrow={parentStrings.calendar.eyebrow}
        title={parentStrings.calendar.title}
        action={<Button mih={{ base: 44, sm: 36 }}>{commonStrings.today}</Button>}
      />
      <Paper withBorder p={{ base: "xs", sm: "md" }} miw={0}>
        <Text size="xs" c="dimmed" mb="sm" hiddenFrom="sm">
          {parentStrings.calendar.scrollHint}
        </Text>
        <ScrollArea
          type="auto"
          offsetScrollbars
          viewportProps={{ role: "region", "aria-label": parentStrings.calendar.monthViewLabel, tabIndex: 0 }}
        >
          <SimpleGrid cols={7} miw={560} spacing="xs">
            {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((day) => (
              <Text key={day} fw={700} ta="center" c="dimmed">
                {day}
              </Text>
            ))}
            {days.map((day) => (
              <Box key={day} miw={0} mih={90} p="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
                <Text fw={day === 11 ? 800 : 500} c={day === 11 ? "indigo" : undefined}>
                  {day}
                </Text>
                <Stack gap={4} align="flex-start" mt={4}>
                  {day === 11 && (
                    <Badge size="xs" color="blue" maw="100%" h="auto" styles={calendarBadgeStyles}>
                      נועה: שברים
                    </Badge>
                  )}
                  {day === 13 && (
                    <>
                      <Badge size="xs" color="violet" maw="100%" h="auto" styles={calendarBadgeStyles}>
                        מבחן במדעים
                      </Badge>
                      <Badge size="xs" color="orange" maw="100%" h="auto" styles={calendarBadgeStyles}>
                        עדכון למשפחה
                      </Badge>
                    </>
                  )}
                  {day === 14 && (
                    <Badge size="xs" color="teal" maw="100%" h="auto" styles={calendarBadgeStyles}>
                      יום קריאה
                    </Badge>
                  )}
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}
