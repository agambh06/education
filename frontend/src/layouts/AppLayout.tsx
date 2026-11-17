import { ActionIcon, AppShell, Button, Group, SegmentedControl } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBell, IconMenu2, IconMoonStars, IconSun, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
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
        <Group h="100%" justify="space-between" px="md">
          <ActionIcon
            hiddenFrom="sm"
            variant="subtle"
            onClick={toggle}
            aria-label={opened ? appStrings.closeNavigation : appStrings.openNavigation}
            aria-expanded={opened}
          >
            {opened ? (
              <IconX size={20} stroke={1.75} aria-hidden="true" />
            ) : (
              <IconMenu2 size={20} stroke={1.75} aria-hidden="true" />
            )}
          </ActionIcon>
          <SegmentedControl value={role} onChange={(value) => onRoleChange(toRole(value))} data={roles} />
          <Group gap="xs">
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
            <ActionIcon variant="light" aria-label={appStrings.notifications}>
              <IconBell size={20} stroke={1.75} aria-hidden="true" />
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
