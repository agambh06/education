export const studentStrings = {
  eyebrow: "היום שלך",
  title: "שלום נועה",
  completionSummary: (completed: number, total: number) =>
    `${completed} מתוך ${total} משימות הושלמו — ממשיכים בקצב שלך.`,
  taskHeading: "מה עושים היום?",
  taskSubheading: "צעדים קטנים שמקרבים אותך למטרה.",
  parentTaskHeading: "מההורים שלך",
  parentTaskSubheading: "משימה אישית שתכננתם יחד.",
  parentTask: "לתרגל אוצר מילים",
  upcomingExams: "מבחנים קרובים",
  examsLoading: "טוען מבחנים...",
  examsError: "לא ניתן לטעון את המבחנים כרגע.",
  examsEmpty: "אין מבחנים קרובים.",
  preparation: (percentage: number) => `התקדמות בהכנה: ${percentage}%`,
} as const;
