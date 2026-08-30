import { ActionIcon, AppShell, Button, Group, SegmentedControl } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { Sidebar } from "../components/navigation/Sidebar";
import { appStrings } from "../shared/strings/app";
import type { AppPage, Role } from "../types/domain";

interface Props {
  children: ReactNode;
  role: Role;
  page: AppPage;
  darkMode: boolean;
  onRoleChange: (role: Role) => void;
  onPageChange: (page: AppPage) => void;
  onThemeToggle: () => void;
}
const roles: { label: string; value: Role }[] = [
  { label: appStrings.roles.parent, value: "parent" },
  { label: appStrings.roles.student, value: "student" },
  { label: appStrings.roles.teacher, value: "teacher" },
  { label: appStrings.roles.admin, value: "admin" },
];
function toRole(value: string): Role {
  const role = roles.find((item) => item.value === value);
  return role?.value ?? "parent";
}
export function AppLayout({ children, role, page, darkMode, onRoleChange, onPageChange, onThemeToggle }: Props) {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: 246, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "xl" }}
    >
      <AppShell.Header>
        <Group h="100%" justify="space-between" px="md">
          <ActionIcon hiddenFrom="sm" variant="subtle" onClick={toggle} aria-label={appStrings.openNavigation}>
            ☰
          </ActionIcon>
          <SegmentedControl value={role} onChange={(value) => onRoleChange(toRole(value))} data={roles} />
          <Group gap="xs">
            <ActionIcon
              variant="light"
              onClick={onThemeToggle}
              aria-label={darkMode ? appStrings.lightMode : appStrings.darkMode}
            >
              {darkMode ? "☀" : "◐"}
            </ActionIcon>
            <ActionIcon variant="light" aria-label={appStrings.notifications}>
              ♧
            </ActionIcon>
            <Button variant="subtle" size="compact-sm">
              אגם כהן
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <Sidebar role={role} page={page} onPageChange={onPageChange} />
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
