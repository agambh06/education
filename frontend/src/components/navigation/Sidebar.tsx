import type { AppPage, Role } from "../../types/domain";
import { Avatar } from "../ui/Avatar";
interface Props {
  role: Role;
  page: AppPage;
  onPageChange: (page: AppPage) => void;
}
const nav: Record<Role, AppPage[]> = {
  parent: ["סקירה", "משימות", "מבחנים", "לוח שנה", "הודעות"],
  student: ["סקירה", "משימות", "מבחנים", "לוח שנה"],
  teacher: ["סקירה", "הכיתות שלי", "משימות", "מבחנים", "הודעות"],
  admin: ["סקירה", "תלמידים", "צוות", "עדכונים", "הגדרות"],
};
const icons: Record<AppPage, string> = {
  סקירה: "⌂",
  משימות: "✓",
  מבחנים: "▣",
  "לוח שנה": "□",
  הודעות: "✉",
  "הכיתות שלי": "♧",
  תלמידים: "♧",
  צוות: "♙",
  עדכונים: "◈",
  הגדרות: "⚙",
};
export function Sidebar({ role, page, onPageChange }: Props) {
  const label: Record<Role, string> = {
    parent: "אזור הורים",
    student: "אזור תלמידים",
    teacher: "אזור מורים",
    admin: "אזור הנהלה",
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <i>●</i>סקוּ<span>לי</span>
      </div>
      <p className="workspace-label">{label[role]}</p>
      <nav>
        {nav[role].map((item) => (
          <button key={item} className={page === item ? "active" : ""} onClick={() => onPageChange(item)}>
            <span>{icons[item]}</span>
            {item}
            {item === "הודעות" && <b>2</b>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button>
          <span>⚙</span>הגדרות
        </button>
        <div className="profile">
          <Avatar initials={role === "student" ? "נכ" : "אכ"} />
          <div>
            <strong>{role === "student" ? "נועה כהן" : "אגם כהן"}</strong>
            <small>
              חשבון {role === "student" ? "תלמידה" : role === "teacher" ? "מורה" : role === "admin" ? "הנהלה" : "הורה"}
            </small>
          </div>
          <span>⌄</span>
        </div>
      </div>
    </aside>
  );
}
