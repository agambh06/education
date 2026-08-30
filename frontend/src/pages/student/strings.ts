export const studentStrings = {
  eyebrow: "היום שלך",
  title: "שלום נועה 👋",
  completionSummary: (completed: number, total: number) =>
    `${completed} מתוך ${total} משימות הושלמו — ממשיכים בקצב שלך.`,
  taskHeading: "מה עושים היום?",
  taskSubheading: "צעדים קטנים שמקרבים אותך למטרה.",
  parentTaskHeading: "מההורים שלך",
  parentTaskSubheading: "משימה אישית שתכננתם יחד.",
  parentTask: "לתרגל אוצר מילים",
  upcomingExams: "מבחנים קרובים",
  preparation: "60% הכנה · בעוד 4 ימים",
} as const;
