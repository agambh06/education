import { PageHeader } from "../../components/ui/PageHeader";
export function CalendarPage() {
  const dates = Array.from({ length: 31 }, (_, index) => index + 1);
  return (
    <>
      <PageHeader eyebrow="לוח זמנים משפחתי" title="לוח שנה" action={<button className="primary">היום</button>} />
      <div className="legend">
        ● משימות　 <b>●</b> מבחנים　 <i>●</i> אירועים　 <em>●</em> עדכונים
      </div>
      <section className="calendar">
        <div className="week">
          {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((day) => (
            <b key={day}>{day}</b>
          ))}
        </div>
        <div className="dates">
          {dates.map((day) => (
            <div key={day} className={day === 11 ? "today" : ""}>
              <span>{day}</span>
              {day === 11 && <small className="blue">נועה: שברים</small>}
              {day === 13 && (
                <>
                  <small className="purple">מבחן במדעים</small>
                  <small className="orange">עדכון למשפחה</small>
                </>
              )}
              {day === 14 && <small className="green">יום קריאה</small>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
