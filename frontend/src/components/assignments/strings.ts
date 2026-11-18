export const assignmentStrings = {
  titleLabel: "כותרת המשימה",
  titlePlaceholder: "לדוגמה: דף תרגול שברים",
  subjectLabel: "מקצוע",
  classLabel: "כיתה",
  descriptionLabel: "תיאור",
  descriptionPlaceholder: "הוסיפו הנחיות לתלמידים ולהורים...",
  dueDateLabel: "תאריך הגשה",
  addFile: "＋ הוספת קובץ",
  saveDraft: "שמירה כטיוטה",
  publish: "פרסום המשימה",
  subjects: ["מתמטיקה", "מדעים", "אנגלית"],
  classes: ["כיתה ו׳1", "כיתה ו׳2"],
  completedNotification: "המשימה סומנה כהושלמה. כל הכבוד!",
  publishedNotification: "המשימה פורסמה למשפחות כיתה ו׳1.",
} as const;

export const assignmentDataStrings = {
  loading: "טוענים משימות...",
  empty: "אין משימות להצגה.",
  loadError: "לא הצלחנו לטעון את המשימות. בדקו את החיבור ונסו שוב.",
  completeError: "לא הצלחנו לשמור את השלמת המשימה. נסו שוב.",
  retry: "ניסיון חוזר",
} as const;
