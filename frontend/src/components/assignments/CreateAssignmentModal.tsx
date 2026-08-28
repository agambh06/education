import { Modal } from "../ui/Modal";
interface Props {
  onClose: () => void;
  onPublish: () => void;
}
export function CreateAssignmentModal({ onClose, onPublish }: Props) {
  return (
    <Modal onClose={onClose}>
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          onPublish();
        }}
      >
        <header>
          <div>
            <p className="eyebrow">פרסום למשפחות</p>
            <h2>משימה חדשה</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          כותרת המשימה
          <input required placeholder="לדוגמה: דף תרגול שברים" />
        </label>
        <div className="form-row">
          <label>
            מקצוע
            <select defaultValue="מתמטיקה">
              <option>מתמטיקה</option>
              <option>מדעים</option>
              <option>אנגלית</option>
            </select>
          </label>
          <label>
            כיתה
            <select defaultValue="כיתה ו׳1">
              <option>כיתה ו׳1</option>
              <option>כיתה ו׳2</option>
            </select>
          </label>
        </div>
        <label>
          תיאור
          <textarea placeholder="הוסיפו הנחיות לתלמידים ולהורים..." />
        </label>
        <div className="form-row">
          <label>
            תאריך הגשה
            <input type="date" required />
          </label>
          <label>
            קבצים מצורפים
            <button type="button" className="attach">
              ＋ הוספת קובץ
            </button>
          </label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>
            שמירה כטיוטה
          </button>
          <button className="primary">פרסום המשימה</button>
        </footer>
      </form>
    </Modal>
  );
}
