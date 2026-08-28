import { messages } from "../../data/mockData";
import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/PageHeader";
export function MessagesPage() {
  const active = messages[0];
  return (
    <>
      <PageHeader
        eyebrow="שיחות"
        title="הודעות"
        description="תקשורת פשוטה עם המורים של הילדים."
        action={<button className="primary">+ הודעה חדשה</button>}
      />
      <section className="messages">
        <div className="people">
          <input placeholder="חיפוש הודעות" />
          {messages.map((message, index) => (
            <button key={message.id} className={"person " + (index === 0 ? "active" : "")}>
              <Avatar initials={message.initials} tone="sky" />
              <div>
                <strong>{message.teacher}</strong>
                <p>{message.preview}</p>
              </div>
              {message.unread && <i />}
            </button>
          ))}
        </div>
        <div className="chat">
          <header>
            <Avatar initials={active.initials} tone="coral" />
            <div>
              <strong>{active.teacher}</strong>
              <small>מתמטיקה · נועה כהן</small>
            </div>
          </header>
          <p className="bubble">
            {active.body}
            <small>{active.sentAt}</small>
          </p>
          <p className="bubble sent">
            תודה, נדאג לסיים את המשימה הערב.<small>09:46</small>
          </p>
          <div className="reply">
            <input placeholder="כתיבת הודעה..." />
            <button>↑</button>
          </div>
        </div>
      </section>
    </>
  );
}
