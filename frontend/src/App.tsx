import { useState } from "react";
import "./App.css";
import { classes, exams, students } from "./data/mockData";
import { useAssignments } from "./hooks/useAssignments";
import { AppLayout } from "./layouts/AppLayout";
import { CreateAssignmentModal } from "./components/assignments/CreateAssignmentModal";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AssignmentsPage } from "./pages/parent/AssignmentsPage";
import { CalendarPage } from "./pages/parent/CalendarPage";
import { ExamsPage } from "./pages/parent/ExamsPage";
import { MessagesPage } from "./pages/parent/MessagesPage";
import { ParentDashboardPage } from "./pages/parent/ParentDashboardPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import type { AppPage, AssignmentStatus, Role } from "./types/domain";

function App() {
  const [role, setRole] = useState<Role>("parent");
  const [page, setPage] = useState<AppPage>("סקירה");
  const [darkMode, setDarkMode] = useState(false);
  const [studentId, setStudentId] = useState("all");
  const [filter, setFilter] = useState<"הכול" | AssignmentStatus>("הכול");
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const { visibleItems, complete } = useAssignments(studentId, filter);
  const changeRole = (nextRole: Role) => {
    setRole(nextRole);
    setPage("סקירה");
  };
  const markComplete = (id: string) => {
    complete(id);
    setNotice("המשימה סומנה כהושלמה. כל הכבוד!");
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
      darkMode={darkMode}
      onRoleChange={changeRole}
      onPageChange={setPage}
      onThemeToggle={() => setDarkMode((value) => !value)}
    >
      {notice && (
        <div className="toast">
          ✓ {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      {content}
      {showCreate && (
        <CreateAssignmentModal
          onClose={() => setShowCreate(false)}
          onPublish={() => {
            setShowCreate(false);
            setNotice("המשימה פורסמה למשפחות כיתה ו׳1.");
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
