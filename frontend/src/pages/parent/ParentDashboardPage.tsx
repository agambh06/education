import type { Assignment, Student } from "../../types/domain";
import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/dashboard/StatCard";

interface ParentDashboardPageProps {
  students: Student[];
  selectedStudentId: string;
  assignments: Assignment[];
  onStudentChange: (id: string) => void;
}
export function ParentDashboardPage({
  students,
  selectedStudentId,
  assignments,
  onStudentChange,
}: ParentDashboardPageProps) {
  const selected = students.find((student) => student.id === selectedStudentId);
  const toDo = assignments.filter((item) => item.status === "לביצוע").length;
  return (
    <>
      <PageHeader
        eyebrow="יום שני, 11 במרץ"
        title="בוקר טוב, אגם 👋"
        description="הנה כל מה שקורה עם המשפחה שלך היום."
        action={
          <div className="family-select">
            <Avatar initials={selected?.initials ?? "נ״ד"} tone={selected?.tone ?? "indigo"} />
            <div>
              <small>תצוגה</small>
              <strong>{selected ? selected.firstName : "כל הילדים"}</strong>
            </div>
            <select value={selectedStudentId} onChange={(event) => onStudentChange(event.target.value)}>
              <option value="all">כל הילדים</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <section className="attention-banner">
        <i>!</i>
        <div>
          <strong>יש 3 פריטים שמחכים לתשומת הלב שלך</strong>
          <p>משימה אחת להגשה מחר ולדניאל יש משימה באיחור.</p>
        </div>
        <button>לצפייה ←</button>
      </section>
      <div className="stats">
        <StatCard icon="✓" tone="orange" value={String(toDo)} label="משימות לביצוע" note="אחת להגשה מחר" />
        <StatCard icon="▣" tone="purple" value="2" label="מבחנים קרובים" note="הבא בעוד יומיים" />
        <StatCard icon="✉" tone="blue" value="2" label="הודעות שלא נקראו" note="מהמורה לוי" />
        <StatCard icon="◷" tone="teal" value="4" label="אירועים קרובים" note="השבוע" />
      </div>
      <section className="section attention">
        <SectionHeading title="דורש תשומת לב" sub="דברים חשובים שכדאי לשים לב אליהם." link="לכל הפריטים" />
        <AttentionRow
          initials="נכ"
          tone="coral"
          badge="משימה להגשה מחר"
          title="דף תרגול שברים"
          detail="מתמטיקה · המורה לוי · נועה"
          date="מחר, 09:00"
          action="למשימה"
        />
        <AttentionRow
          initials="דכ"
          tone="sky"
          badge="משימה באיחור"
          title="תרגול איות"
          detail="עברית · המורה בר · דניאל"
          date="מועד הגשה: 8 במרץ"
          action="סימון כהושלם"
          badgeTone="red"
        />
        <AttentionRow
          initials="נכ"
          tone="coral"
          badge="מבחן קרוב"
          title="מדעים: מערכת השמש"
          detail="מדעים · המורה רובין · נועה"
          date="ד׳, 13 במרץ · 10:30"
          action="לפרטים"
          badgeTone="purple"
        />
      </section>
      <div className="columns">
        <section className="section">
          <SectionHeading title="מה בקרוב" sub="לוח הזמנים המשפחתי לשבוע הקרוב." link="ללוח השנה ←" />
          <Schedule day="11" type="שיעורי בית" title="דף תרגול שברים" detail="נועה · מתמטיקה" />
          <Schedule day="13" type="מבחן" title="מדעים: מערכת השמש" detail="נועה · 10:30" tone="purple" />
          <Schedule day="14" type="אירוע בית ספרי" title="יום קריאה משפחתי" detail="כל הילדים · 09:00" tone="green" />
        </section>
        <section className="section">
          <SectionHeading title="התקדמות שבועית" sub="משימות שהושלמו השבוע." />
          <Progress initials="נכ" tone="coral" child="נועה" value={75} detail="3 מתוך 4 הושלמו" />
          <Progress initials="דכ" tone="sky" child="דניאל" value={50} detail="2 מתוך 4 הושלמו" />
          <button className="outline full">למעקב אחר התקדמות</button>
        </section>
      </div>
      <section className="section announcement">
        <div className="announcement-art">✦</div>
        <div>
          <span className="tag blue">עדכון בית ספרי</span>
          <h3>יום הקריאה המשפחתי יתקיים ביום חמישי</h3>
          <p>נשמח לפגוש אתכם בספריית בית הספר לסיפורים, פעילויות ואורח מיוחד.</p>
          <small>פורסם היום על ידי בית ספר וסטוויו</small>
        </div>
        <button className="link">לקריאה נוספת ←</button>
      </section>
    </>
  );
}
function SectionHeading({ title, sub, link }: { title: string; sub: string; link?: string }) {
  return (
    <header className="heading">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {link && <button className="link">{link}</button>}
    </header>
  );
}
function AttentionRow({
  initials,
  tone,
  badge,
  title,
  detail,
  date,
  action,
  badgeTone = "orange",
}: {
  initials: string;
  tone: "coral" | "sky";
  badge: string;
  title: string;
  detail: string;
  date: string;
  action: string;
  badgeTone?: "orange" | "red" | "purple";
}) {
  return (
    <article className="attention-row">
      <Avatar initials={initials} tone={tone} />
      <div>
        <span className={"tag " + badgeTone}>{badge}</span>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      <aside>
        <strong>{date}</strong>
        <button className="link">{action} ←</button>
      </aside>
    </article>
  );
}
function Schedule({
  day,
  type,
  title,
  detail,
  tone = "blue",
}: {
  day: string;
  type: string;
  title: string;
  detail: string;
  tone?: "blue" | "purple" | "green";
}) {
  return (
    <div className="schedule">
      <b>
        {day}
        <small>מרץ</small>
      </b>
      <i className={tone} />
      <div>
        <small>{type}</small>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
function Progress({
  initials,
  tone,
  child,
  value,
  detail,
}: {
  initials: string;
  tone: "coral" | "sky";
  child: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="progress">
      <Avatar initials={initials} tone={tone} />
      <div>
        <p>
          <strong>{child}</strong>
          <span>{detail}</span>
        </p>
        <i>
          <b style={{ width: value + "%" }} />
        </i>
      </div>
      <strong>{value}%</strong>
    </div>
  );
}
