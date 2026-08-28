import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/dashboard/StatCard";
export function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="בית ספר וסטוויו"
        title="סקירת בית הספר"
        description="תמונה ברורה של קהילת בית הספר היום."
        action={<button className="primary">+ עדכון חדש</button>}
      />
      <div className="stats">
        <StatCard icon="◉" tone="blue" value="486" label="תלמידים פעילים" note="ב-18 כיתות" />
        <StatCard icon="♧" tone="purple" value="42" label="צוות הוראה" note="כל החשבונות פעילים" />
        <StatCard icon="✓" tone="orange" value="27" label="פריטים להגשה השבוע" note="בכל הכיתות" />
        <StatCard icon="✉" tone="teal" value="18" label="הודעות מהורים" note="ממתינות למענה" />
      </div>
      <section className="section admin">
        <header className="heading">
          <div>
            <h2>פעילות בית הספר</h2>
            <p>עדכונים אחרונים מכלל בית הספר.</p>
          </div>
        </header>
        <p>הבסיס לממשק הניהול מוכן להרחבה עם הרשאות API.</p>
      </section>
    </>
  );
}
