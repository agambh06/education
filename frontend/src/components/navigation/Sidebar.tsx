import { Avatar, Box, Divider, NavLink, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconCalendarEvent,
  IconChecklist,
  IconHome,
  IconMail,
  IconSchool,
  IconSettings,
  IconSpeakerphone,
  IconUser,
  IconUsers,
  IconWriting,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import familyLearningIcon from "../../assets/family-learning-icon.svg";
import { appStrings, navigationStrings } from "../../shared/strings/app";
import type { AppPage, Role } from "../../types/domain";

interface Props {
  role: Role;
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
const icons: Record<AppPage, ReactNode> = {
  סקירה: <IconHome size={18} stroke={1.75} aria-hidden="true" />,
  משימות: <IconChecklist size={18} stroke={1.75} aria-hidden="true" />,
  מבחנים: <IconWriting size={18} stroke={1.75} aria-hidden="true" />,
  "לוח שנה": <IconCalendarEvent size={18} stroke={1.75} aria-hidden="true" />,
  הודעות: <IconMail size={18} stroke={1.75} aria-hidden="true" />,
  "הכיתות שלי": <IconSchool size={18} stroke={1.75} aria-hidden="true" />,
  תלמידים: <IconUser size={18} stroke={1.75} aria-hidden="true" />,
  צוות: <IconUsers size={18} stroke={1.75} aria-hidden="true" />,
  עדכונים: <IconSpeakerphone size={18} stroke={1.75} aria-hidden="true" />,
  הגדרות: <IconSettings size={18} stroke={1.75} aria-hidden="true" />,
};
export function Sidebar({ role, page, onPageChange }: Props) {
  const label: Record<Role, string> = {
    parent: appStrings.areas.parent,
    student: appStrings.areas.student,
    teacher: appStrings.areas.teacher,
    admin: appStrings.areas.admin,
  };
  return (
    <Stack h="100%" p="md" style={{ overflowY: "auto" }}>
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
            component="button"
            key={item}
            label={item}
            active={page === item}
            leftSection={
              <ThemeIcon size="sm" variant="transparent">
                {icons[item]}
              </ThemeIcon>
            }
            onClick={() => onPageChange(item)}
            mih={44}
          />
        ))}
      </Stack>
      <Box mt="auto">
        <Divider mb="md" />
        <NavLink
          label={appStrings.settings}
          leftSection={<IconSettings size={18} stroke={1.75} aria-hidden="true" />}
          disabled={role !== "parent"}
          active={role === "parent" && page === appStrings.settings}
          onClick={role === "parent" ? () => onPageChange(appStrings.settings) : undefined}
        />
        <Box mt="md">
          <Avatar color="indigo" radius="xl">
            אכ
          </Avatar>
          <Text fw={700} size="sm" mt={6}>
            {role === "student" ? "נועה כהן" : "אגם כהן"}
          </Text>
          <Text c="dimmed" size="xs">
            חשבון {role === "student" ? "תלמידה" : role === "teacher" ? "מורה" : "הורה"}
          </Text>
        </Box>
      </Box>
    </Stack>
  );
}
