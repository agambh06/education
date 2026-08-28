import type { Assignment, Exam, Message, Parent, SchoolClass, Student, Teacher } from "../types/domain";
export const currentParent: Parent = {
  id: "parent-1",
  firstName: "אגם",
  lastName: "כהן",
  role: "parent",
  email: "agam@example.com",
  initials: "אכ",
  studentIds: ["noa", "daniel"],
};
export const currentTeacher: Teacher = {
  id: "teacher-1",
  firstName: "יעל",
  lastName: "לוי",
  role: "teacher",
  email: "yael@example.com",
  initials: "יל",
  subject: "מתמטיקה",
  classIds: ["6a", "6b", "5a"],
};
export const students: Student[] = [
  { id: "noa", firstName: "נועה", lastName: "כהן", classId: "6a", initials: "נכ", tone: "coral" },
  { id: "daniel", firstName: "דניאל", lastName: "כהן", classId: "3b", initials: "דכ", tone: "sky" },
];
export const classes: SchoolClass[] = [
  { id: "6a", name: "מתמטיקה · כיתה ו׳1", studentCount: 28 },
  { id: "6b", name: "מתמטיקה · כיתה ו׳2", studentCount: 26 },
  { id: "5a", name: "סדנת מתמטיקה · כיתה ה׳", studentCount: 24 },
];
export const assignments: Assignment[] = [
  {
    id: "a1",
    studentId: "noa",
    subject: "מתמטיקה",
    teacher: "המורה לוי",
    title: "דף תרגול שברים",
    dueLabel: "מחר, 09:00",
    status: "לביצוע",
    description: "יש להשלים את שאלות 1–12 בדף העבודה המצורף.",
    tone: "blue",
  },
  {
    id: "a2",
    studentId: "daniel",
    subject: "אנגלית",
    teacher: "המורה גרין",
    title: "קריאת ״הגן הסודי״",
    dueLabel: "ה׳, 14 במרץ",
    status: "לביצוע",
    description: "לקרוא פרקים 3–4 ולרשום שלוש מילים חדשות.",
    tone: "teal",
  },
  {
    id: "a3",
    studentId: "noa",
    subject: "מדעים",
    teacher: "המורה רובין",
    title: "מחקר על מערכת השמש",
    dueLabel: "ב׳, 18 במרץ",
    status: "הושלם",
    description: "להכין דף מידע קצר על כוכב הלכת שנבחר.",
    tone: "purple",
  },
  {
    id: "a4",
    studentId: "daniel",
    subject: "עברית",
    teacher: "המורה בר",
    title: "תרגול איות",
    dueLabel: "מועד הגשה: 8 במרץ",
    status: "באיחור",
    description: "לתרגל את רשימת המילים השבועית.",
    tone: "orange",
  },
];
export const exams: Exam[] = [
  {
    id: "e1",
    studentId: "noa",
    subject: "מדעים",
    title: "מערכת השמש",
    teacher: "המורה רובין",
    dateLabel: "13 במרץ",
    time: "10:30",
  },
  {
    id: "e2",
    studentId: "noa",
    subject: "מתמטיקה",
    title: "שברים ומספרים עשרוניים",
    teacher: "המורה לוי",
    dateLabel: "19 במרץ",
    time: "09:00",
  },
];
export const messages: Message[] = [
  {
    id: "m1",
    teacher: "המורה לוי",
    initials: "יל",
    preview: "תודה על העדכון...",
    body: "שלום אגם! תזכורת שדף תרגול השברים להגשה מחר. נשמח לעזור אם יש לנועה שאלות.",
    sentAt: "09:41",
    unread: true,
  },
  { id: "m2", teacher: "המורה רובין", initials: "יר", preview: "מדריך הלימוד זמין כעת", body: "", sentAt: "" },
  { id: "m3", teacher: "המורה בר", initials: "יב", preview: "דניאל התקדם יפה מאוד", body: "", sentAt: "" },
];
