import { ActionIcon, AppShell, Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { Sidebar } from "../components/navigation/Sidebar";
import { PwaStatus } from "../components/pwa/PwaStatus";
import type { AuthUser } from "../services/authService";
import { appStrings } from "../shared/strings/app";
import type { AppPage, Role } from "../types/domain";

interface Props {
  children: ReactNode;
  role: Role;
  user: AuthUser;
  page: AppPage;
  darkMode: boolean;
  onLogout: () => void;
  onPageChange: (page: AppPage) => void;
  onThemeToggle: () => void;
}
export function AppLayout({ children, role, user, page, darkMode, onLogout, onPageChange, onThemeToggle }: Props) {
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
          <Group gap="xs">
            <Button variant="subtle" size="compact-sm">
              {user.firstName} {user.lastName}
            </Button>
            <Button variant="light" size="compact-sm" onClick={onLogout}>
              {appStrings.logout}
            </Button>
          </Group>
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
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <Sidebar role={role} user={user} page={page} onPageChange={onPageChange} />
      </AppShell.Navbar>
      <AppShell.Main>
        <PwaStatus />
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
