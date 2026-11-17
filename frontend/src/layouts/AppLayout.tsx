import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Button,
  Drawer,
  Flex,
  Group,
  SegmentedControl,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { type ReactNode, useEffect } from "react";
import { Sidebar } from "../components/navigation/Sidebar";
import { PwaStatus } from "../components/pwa/PwaStatus";
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
          <Burger
            hiddenFrom="md"
            opened={opened}
            onClick={toggle}
            size="sm"
            w={44}
            h={44}
            aria-label={appStrings.openNavigation}
            aria-expanded={opened}
          />
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="light"
              onClick={onThemeToggle}
              aria-label={darkMode ? appStrings.lightMode : appStrings.darkMode}
              size={44}
            >
              {darkMode ? "☀" : "◐"}
            </ActionIcon>
            <ActionIcon size={44} variant="light" aria-label={appStrings.notifications}>
              ♧
            </ActionIcon>
            <Button variant="subtle" size="compact-sm" mih={44} px="xs">
              {appStrings.userName}
            </Button>
          </Group>
          <Box w={{ base: "100%", md: "auto" }} miw={0}>
            <SegmentedControl
              fullWidth
              value={role}
              onChange={(value) => {
                onRoleChange(toRole(value));
                close();
              }}
              data={roles}
              aria-label={appStrings.chooseRole}
              styles={{ label: { minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" } }}
            />
          </Box>
        </Flex>
      </AppShell.Header>
      <AppShell.Navbar>
        <Sidebar role={role} page={page} onPageChange={changePage} />
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
        <Sidebar role={role} page={page} onPageChange={changePage} />
      </Drawer>
      <AppShell.Main miw={0}>
        <PwaStatus />
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
