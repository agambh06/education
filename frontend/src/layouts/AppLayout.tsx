import type { ReactNode } from "react";
import type { AppPage, Role } from "../types/domain";
import { Sidebar } from "../components/navigation/Sidebar";
import { Avatar } from "../components/ui/Avatar";
interface Props {
  children: ReactNode;
  role: Role;
  page: AppPage;
  darkMode: boolean;
  onRoleChange: (role: Role) => void;
  onPageChange: (page: AppPage) => void;
  onThemeToggle: () => void;
}
const labels: Record<Role, string> = { parent: "הורה", student: "תלמידה", teacher: "מורה", admin: "הנהלה" };
export function AppLayout({ children, role, page, darkMode, onRoleChange, onPageChange, onThemeToggle }: Props) {
  return (
    <div className={"product " + (darkMode ? "dark" : "")}>
      <Sidebar role={role} page={page} onPageChange={onPageChange} />
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu">☰</button>
          <div className="role-switch">
            {(["parent", "student", "teacher", "admin"] as Role[]).map((item) => (
              <button key={item} className={role === item ? "selected" : ""} onClick={() => onRoleChange(item)}>
                {labels[item]}
              </button>
            ))}
          </div>
          <div className="top-actions">
            <button onClick={onThemeToggle} title={darkMode ? "מצב בהיר" : "מצב כהה"}>
              {darkMode ? "☀" : "◐"}
            </button>
            <button className="help">?</button>
            <button className="bell">
              ♧<i />
            </button>
            <Avatar initials={role === "student" ? "נכ" : "אכ"} />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
