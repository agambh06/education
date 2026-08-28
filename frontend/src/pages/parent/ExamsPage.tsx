import { exams } from "../../data/mockData";
import { PageHeader } from "../../components/ui/PageHeader";
export function ExamsPage() {
  return (
    <>
      <PageHeader eyebrow="להיות מוכנים" title="מבחנים קרובים" description="כל מה שהילדים צריכים כדי להגיע מוכנים." />
      <section className="exam-hero">
        <div>
          <span className="tag translucent">בעוד יומיים</span>
          <h2>מדעים: מערכת השמש</h2>
          <p>נועה · כיתה ו׳1 · המורה רובין</p>
          <div>◷ יום ד׳, 13 במרץ　 ◴ 10:30　 ⌂ חדר 204</div>
          <button>לחומרי הלימוד ←</button>
        </div>
        <b>◉</b>
      </section>
      <div className="exam-list">
        {exams.map((exam) => (
          <article className="exam" key={exam.id}>
            <b>
              {exam.dateLabel.split(" ")[0]}
              <small>מרץ</small>
            </b>
            <i className="dot purple" />
            <div>
              <span>{exam.subject} · נועה כהן</span>
              <h3>{exam.title}</h3>
              <p>
                {exam.teacher} · {exam.time}
              </p>
            </div>
            <button className="outline">חומרי לימוד</button>
          </article>
        ))}
      </div>
    </>
  );
}
