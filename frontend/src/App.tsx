import { Center, Loader, Text, useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { CreateAssignmentModal } from "./components/assignments/CreateAssignmentModal";
import { assignmentStrings } from "./components/assignments/strings";
import { ALL_STUDENTS_ID } from "./constants/app";
import { classes, exams, students } from "./data/mockData";
import { useAssignments } from "./hooks/useAssignments";
import { AppLayout } from "./layouts/AppLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AuthPage } from "./pages/auth/AuthPage";
import { authStrings } from "./pages/auth/strings";
import { AssignmentsPage } from "./pages/parent/AssignmentsPage";
import { CalendarPage } from "./pages/parent/CalendarPage";
import { ExamsPage } from "./pages/parent/ExamsPage";
import { LearningRemindersPage } from "./pages/parent/LearningRemindersPage";
import { MessagesPage } from "./pages/parent/MessagesPage";
import { ParentDashboardPage } from "./pages/parent/ParentDashboardPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { type AuthUser, authService } from "./services/authService";
import { appStrings } from "./shared/strings/app";
import { commonStrings } from "./shared/strings/common";
import type { AppPage, AssignmentStatus, Role } from "./types/domain";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .current()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Text>
          <Loader size="sm" mr="sm" />
          {authStrings.loading}
        </Text>
      </Center>
    );
  }
  if (!user) return <AuthPage onAuthenticated={setUser} />;
  return <AuthenticatedApp user={user} onLogout={() => setUser(null)} />;
}

function AuthenticatedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const role: Role = user.role.toLowerCase() as Role;
  const [page, setPage] = useState<AppPage>("סקירה");
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [filter, setFilter] = useState<"הכול" | AssignmentStatus>(commonStrings.all);
  const [showCreate, setShowCreate] = useState(false);
  const { visibleItems, complete } = useAssignments(ALL_STUDENTS_ID, filter);
  const markComplete = (id: string) => {
    complete(id);
    notifications.show({ message: assignmentStrings.completedNotification, color: "teal" });
  };
  const content =
    role === "parent" ? (
      renderParentPage(page, visibleItems, filter, setFilter, markComplete)
    ) : role === "student" ? (
      <StudentDashboardPage assignments={visibleItems} exams={exams} onComplete={markComplete} />
    ) : role === "teacher" ? (
      <TeacherDashboardPage classes={classes} onCreate={() => setShowCreate(true)} />
    ) : (
      <AdminDashboardPage />
    );

  return (
    <AppLayout
      role={role}
      user={user}
      page={page}
      darkMode={colorScheme === "dark"}
      onLogout={async () => {
        await authService.logout().catch(() => undefined);
        onLogout();
      }}
      onPageChange={setPage}
      onThemeToggle={() => toggleColorScheme()}
    >
      {content}
      {showCreate && (
        <CreateAssignmentModal
          onClose={() => setShowCreate(false)}
          onPublish={() => {
            setShowCreate(false);
            notifications.show({ message: assignmentStrings.publishedNotification, color: "indigo" });
          }}
        />
      )}
    </AppLayout>
  );
}

function renderParentPage(
  page: AppPage,
  assignments: ReturnType<typeof useAssignments>["visibleItems"],
  filter: "הכול" | AssignmentStatus,
  setFilter: (filter: "הכול" | AssignmentStatus) => void,
  complete: (id: string) => void,
) {
  if (page === "משימות")
    return (
      <AssignmentsPage
        assignments={assignments}
        students={students}
        filter={filter}
        onFilterChange={setFilter}
        onComplete={complete}
      />
    );
  if (page === "מבחנים") return <ExamsPage />;
  if (page === "לוח שנה") return <CalendarPage />;
  if (page === "הודעות") return <MessagesPage />;
  if (page === appStrings.settings) return <LearningRemindersPage />;
  return <ParentDashboardPage />;
}

export default App;
