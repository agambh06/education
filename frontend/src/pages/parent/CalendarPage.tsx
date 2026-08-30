import { Badge, Box, Button, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader";
import { commonStrings } from "../../shared/strings/common";
import { parentStrings } from "./strings";
export function CalendarPage() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return (
    <Stack>
      <PageHeader
        eyebrow={parentStrings.calendar.eyebrow}
        title={parentStrings.calendar.title}
        action={<Button>{commonStrings.today}</Button>}
      />
      <Paper withBorder p="md">
        <SimpleGrid cols={7}>
          {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((day) => (
            <Text key={day} fw={700} ta="center" c="dimmed">
              {day}
            </Text>
          ))}
          {days.map((day) => (
            <Box key={day} mih={90} p="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
              <Text fw={day === 11 ? 800 : 500} c={day === 11 ? "indigo" : undefined}>
                {day}
              </Text>
              {day === 11 && (
                <Badge size="xs" color="blue">
                  נועה: שברים
                </Badge>
              )}
              {day === 13 && (
                <>
                  <Badge size="xs" color="violet">
                    מבחן במדעים
                  </Badge>
                  <Badge size="xs" color="orange">
                    עדכון למשפחה
                  </Badge>
                </>
              )}
              {day === 14 && (
                <Badge size="xs" color="teal">
                  יום קריאה
                </Badge>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
