import { Avatar, Box, Divider, NavLink, Stack, Text, ThemeIcon } from "@mantine/core";
import familyLearningIcon from "../../assets/family-learning-icon.svg";
import type { AuthUser } from "../../services/authService";
import { appStrings, navigationStrings } from "../../shared/strings/app";
import type { AppPage, Role } from "../../types/domain";

interface Props {
  role: Role;
  user: AuthUser;
  page: AppPage;
  onPageChange: (page: AppPage) => void;
}
const nav: Record<Role, AppPage[]> = {
  parent: [
    navigationStrings.overview,
    navigationStrings.assignments,
    navigationStrings.exams,
    navigationStrings.calendar,
    navigationStrings.messages,
  ],
  student: [
    navigationStrings.overview,
    navigationStrings.assignments,
    navigationStrings.exams,
    navigationStrings.calendar,
  ],
  teacher: [
    navigationStrings.overview,
    navigationStrings.classes,
    navigationStrings.assignments,
    navigationStrings.exams,
    navigationStrings.messages,
  ],
  admin: [
    navigationStrings.overview,
    navigationStrings.students,
    navigationStrings.staff,
    navigationStrings.announcements,
    appStrings.settings,
  ],
};
const icons: Record<AppPage, string> = {
  סקירה: "⌂",
  משימות: "✓",
  מבחנים: "▣",
  "לוח שנה": "□",
  הודעות: "✉",
  "הכיתות שלי": "♧",
  תלמידים: "♧",
  צוות: "♙",
  עדכונים: "◈",
  הגדרות: "⚙",
};
export function Sidebar({ role, user, page, onPageChange }: Props) {
  const label: Record<Role, string> = {
    parent: appStrings.areas.parent,
    student: appStrings.areas.student,
    teacher: appStrings.areas.teacher,
    admin: appStrings.areas.admin,
  };
  return (
    <Stack h="100%" p="md">
      <Box>
        <Box component="img" src={familyLearningIcon} alt="סקוּלי" w={42} h={42} mb="xs" />
        <Text fw={800} fz="xl">
          סקוּ
          <Text span c="indigo">
            לי
          </Text>
        </Text>
        <Text c="dimmed" fw={700} size="xs" tt="uppercase" mt="xl">
          {label[role]}
        </Text>
      </Box>
      <Stack gap={4}>
        {nav[role].map((item) => (
          <NavLink
            key={item}
            label={item}
            active={page === item}
            leftSection={
              <ThemeIcon size="sm" variant="transparent">
                {icons[item]}
              </ThemeIcon>
            }
            onClick={() => onPageChange(item)}
          />
        ))}
      </Stack>
      <Box mt="auto">
        <Divider mb="md" />
        <NavLink label={appStrings.settings} leftSection="⚙" />
        <Box mt="md">
          <Avatar color="indigo" radius="xl">
            {user.firstName.slice(0, 1)}
            {user.lastName.slice(0, 1)}
          </Avatar>
          <Text fw={700} size="sm" mt={6}>
            {user.firstName} {user.lastName}
          </Text>
          <Text c="dimmed" size="xs">
            {appStrings.account} {appStrings.roles[role]}
          </Text>
        </Box>
      </Box>
    </Stack>
  );
}
