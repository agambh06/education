import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { CreateAssignmentModal } from "./components/assignments/CreateAssignmentModal";
import { assignmentStrings } from "./components/assignments/strings";
import { ALL_STUDENTS_ID } from "./constants/app";
import { classes, exams, students } from "./data/mockData";
import { useAssignments } from "./hooks/useAssignments";
import { AppLayout } from "./layouts/AppLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AssignmentsPage } from "./pages/parent/AssignmentsPage";
import { CalendarPage } from "./pages/parent/CalendarPage";
import { ExamsPage } from "./pages/parent/ExamsPage";
import { MessagesPage } from "./pages/parent/MessagesPage";
import { ParentDashboardPage } from "./pages/parent/ParentDashboardPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { commonStrings } from "./shared/strings/common";
import type { AppPage, AssignmentStatus, Role } from "./types/domain";

function App() {
  const [role, setRole] = useState<Role>("parent");
  const [page, setPage] = useState<AppPage>("סקירה");
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [studentId, setStudentId] = useState(ALL_STUDENTS_ID);
  const [filter, setFilter] = useState<"הכול" | AssignmentStatus>(commonStrings.all);
  const [showCreate, setShowCreate] = useState(false);
  const { visibleItems, complete } = useAssignments(studentId, filter);
  const changeRole = (nextRole: Role) => {
    setRole(nextRole);
    setPage("סקירה");
  };
  const markComplete = (id: string) => {
    complete(id);
    notifications.show({ message: assignmentStrings.completedNotification, color: "teal" });
  };
  const content =
    role === "parent" ? (
      renderParentPage(page, visibleItems, studentId, setStudentId, filter, setFilter, markComplete)
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
      page={page}
      darkMode={colorScheme === "dark"}
      onRoleChange={changeRole}
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
  studentId: string,
  setStudentId: (id: string) => void,
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
  return (
    <ParentDashboardPage
      students={students}
      selectedStudentId={studentId}
      assignments={assignments}
      onStudentChange={setStudentId}
    />
  );
}
export default App;
