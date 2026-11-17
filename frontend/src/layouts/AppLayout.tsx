import { ActionIcon, AppShell, Button, Drawer, Flex, Group, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconBell, IconMenu2, IconMoonStars, IconSun, IconX } from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";
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
  const [opened, { toggle, close }] = useDisclosure();
  const theme = useMantineTheme();
  const desktop = useMediaQuery(`(min-width: ${theme.breakpoints.md})`);

  useEffect(() => {
    if (desktop) close();
  }, [desktop, close]);

  const changePage = (nextPage: AppPage) => {
    onPageChange(nextPage);
    close();
  };

  return (
    <AppShell
      header={{ height: { base: 112, md: 68 } }}
      navbar={{ width: 246, breakpoint: "md", collapsed: { mobile: true } }}
      padding={{ base: "sm", sm: "lg", md: "xl" }}
    >
      <AppShell.Header>
        <Flex
          h="100%"
          align="center"
          justify="space-between"
          wrap="wrap"
          direction={{ base: "row", md: "row-reverse" }}
          gap={4}
          px={{ base: "sm", md: "md" }}
          py={{ base: 4, md: 0 }}
        >
          <ActionIcon
            hiddenFrom="md"
            variant="subtle"
            onClick={toggle}
            aria-label={opened ? appStrings.closeNavigation : appStrings.openNavigation}
            aria-expanded={opened}
            size={44}
          >
            {opened ? (
              <IconX size={20} stroke={1.75} aria-hidden="true" />
            ) : (
              <IconMenu2 size={20} stroke={1.75} aria-hidden="true" />
            )}
          </ActionIcon>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="light"
              onClick={onThemeToggle}
              aria-label={darkMode ? appStrings.lightMode : appStrings.darkMode}
              size={44}
            >
              {darkMode ? (
                <IconSun size={20} stroke={1.75} aria-hidden="true" />
              ) : (
                <IconMoonStars size={20} stroke={1.75} aria-hidden="true" />
              )}
            </ActionIcon>
            <ActionIcon size={44} variant="light" aria-label={appStrings.notifications}>
              <IconBell size={20} stroke={1.75} aria-hidden="true" />
            </ActionIcon>
            <Button variant="subtle" size="compact-sm" mih={44} px="xs">
              {user.firstName} {user.lastName}
            </Button>
            <Button variant="light" size="compact-sm" mih={44} px="xs" onClick={onLogout}>
              {appStrings.logout}
            </Button>
          </Group>
        </Flex>
      </AppShell.Header>
      <AppShell.Navbar>
        <Sidebar role={role} user={user} page={page} onPageChange={changePage} />
      </AppShell.Navbar>
      <Drawer
        opened={opened && !desktop}
        onClose={close}
        title={appStrings.navigation}
        position="right"
        size={280}
        hiddenFrom="md"
        padding={0}
        styles={{ inner: { insetInline: 0 } }}
        closeButtonProps={{ "aria-label": appStrings.closeNavigation, size: 44 }}
      >
        <Sidebar role={role} user={user} page={page} onPageChange={changePage} />
      </Drawer>
      <AppShell.Main miw={0}>
        <PwaStatus />
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
