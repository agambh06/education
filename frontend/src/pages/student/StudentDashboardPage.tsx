import type { Assignment, Exam } from "../../types/domain";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
interface Props {
  assignments: Assignment[];
  exams: Exam[];
  onComplete: (id: string) => void;
}
export function StudentDashboardPage({ assignments, exams, onComplete }: Props) {
  const completeCount = assignments.filter((assignment) => assignment.status === "הושלם").length;
  return (
    <>
      <PageHeader
        eyebrow="היום שלך"
        title="שלום נועה 👋"
        description={String(completeCount) + " מתוך " + assignments.length + " משימות הושלמו — ממשיכים בקצב שלך."}
      />
      <section className="section attention">
        <header className="heading">
          <div>
            <h2>מה עושים היום?</h2>
            <p>צעדים קטנים שמקרבים אותך למטרה.</p>
          </div>
        </header>
        {assignments
          .filter((assignment) => assignment.status !== "הושלם")
          .map((assignment) => (
            <article className="attention-row" key={assignment.id}>
              <div>
                <span className="tag blue">{assignment.subject}</span>
                <h3>{assignment.title}</h3>
                <p>
                  {assignment.dueLabel} · {assignment.teacher}
                </p>
              </div>
              <aside>
                <StatusBadge status={assignment.status} />
                {assignment.status === "לביצוע" && (
                  <button className="link" onClick={() => onComplete(assignment.id)}>
                    סיימתי ←
                  </button>
                )}
              </aside>
            </article>
          ))}
      </section>
      <div className="columns">
        <section className="section">
          <header className="heading">
            <div>
              <h2>מההורים שלך</h2>
              <p>משימה אישית שתכננתם יחד.</p>
            </div>
          </header>
          <article className="attention-row">
            <div>
              <span className="tag orange">משימת הורה</span>
              <h3>לתרגל אוצר מילים</h3>
              <p>היום · 18:00 · 20 דקות</p>
            </div>
            <aside>
              <button className="link">סיימתי ←</button>
            </aside>
          </article>
        </section>
        <section className="section">
          <header className="heading">
            <div>
              <h2>מבחנים קרובים</h2>
              <p>ההתקדמות שלך בהכנה.</p>
            </div>
          </header>
          {exams.slice(0, 1).map((exam) => (
            <div className="progress" key={exam.id}>
              <div>
                <p>
                  <strong>
                    {exam.subject}: {exam.title}
                  </strong>
                  <span>בעוד 4 ימים</span>
                </p>
                <i>
                  <b style={{ width: "60%" }} />
                </i>
              </div>
              <strong>60%</strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
