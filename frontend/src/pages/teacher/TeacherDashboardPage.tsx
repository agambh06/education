import type { SchoolClass } from "../../types/domain";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/dashboard/StatCard";
interface Props {
  classes: SchoolClass[];
  onCreate: () => void;
}
export function TeacherDashboardPage({ classes, onCreate }: Props) {
  return (
    <>
      <PageHeader
        eyebrow="יום שני, 11 במרץ"
        title="בוקר טוב, יעל 👋"
        description="הנה תמונת המצב של יום ההוראה שלך."
        action={
          <button className="primary" onClick={onCreate}>
            + משימה חדשה
          </button>
        }
      />
      <section className="quick">
        <div>
          <p>פעולות מהירות</p>
          <h2>לשתף משהו עם הכיתות שלך</h2>
        </div>
        <div>
          <button onClick={onCreate}>
            ＋<span>משימה חדשה</span>
          </button>
          <button onClick={onCreate}>
            ▣<span>מבחן חדש</span>
          </button>
          <button>
            ◈<span>עדכון חדש</span>
          </button>
        </div>
      </section>
      <div className="stats">
        <StatCard icon="▣" tone="blue" value="4" label="כיתות" note="112 תלמידים" />
        <StatCard icon="✓" tone="orange" value="5" label="משימות קרובות" note="2 ממתינות לפרסום" />
        <StatCard icon="◉" tone="purple" value="2" label="מבחנים קרובים" note="החודש" />
        <StatCard icon="✉" tone="teal" value="3" label="הודעות חדשות" note="מאז יום שישי" />
      </div>
      <div className="columns">
        <section className="section">
          <header className="heading">
            <div>
              <h2>הכיתות שלך</h2>
              <p>מערכת השעות של היום.</p>
            </div>
          </header>
          {classes.map((schoolClass, index) => (
            <div className="class" key={schoolClass.id}>
              <b>{["08:30", "10:15", "12:30"][index]}</b>
              <i className={index === 1 ? "purple" : index === 2 ? "orange" : "blue"} />
              <div>
                <strong>{schoolClass.name}</strong>
                <small>{schoolClass.studentCount} תלמידים</small>
              </div>
              <button className="link">פתיחת כיתה ←</button>
            </div>
          ))}
        </section>
        <section className="section">
          <header className="heading">
            <div>
              <h2>תור לפרסום</h2>
              <p>אפשר לסיים טיוטות ולחסוך זמן.</p>
            </div>
          </header>
          <Queue title="דף חזרה על מספרים עשרוניים" detail="כיתה ו׳2 · טיוטה מאתמול" onClick={onCreate} />
          <Queue title="מבחן שברים ומספרים עשרוניים" detail="כיתה ו׳1 · טיוטה מ-8 במרץ" onClick={onCreate} />
        </section>
      </div>
    </>
  );
}
function Queue({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <div className="queue">
      <i className="dot blue" />
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <button className="link" onClick={onClick}>
        לסיום ←
      </button>
    </div>
  );
}
