export interface DemoStudyTask {
  id: string;
  title: string;
  scheduledFor: string;
  durationMins: number;
  completed: boolean;
}
export interface DemoExam {
  id: string;
  title: string;
  subject: string;
  classId: string;
  studentId: string;
  published: boolean;
  topics: string[];
  studyTasks: DemoStudyTask[];
}
const exams: DemoExam[] = [
  {
    id: "exam-1",
    title: "מערכת השמש",
    subject: "מדעים",
    classId: "6a",
    studentId: "noa",
    published: true,
    topics: ["כוכבי לכת", "סיבוב כדור הארץ", "מערכת השמש"],
    studyTasks: [
      { id: "study-1", title: "לתרגל כוכבי לכת", scheduledFor: "היום", durationMins: 20, completed: true },
      { id: "study-2", title: "לפתור שאלות תרגול", scheduledFor: "מחר", durationMins: 30, completed: false },
    ],
  },
];
export const examsService = {
  list: (studentId?: string) =>
    studentId ? exams.filter((exam) => exam.studentId === studentId && exam.published) : exams,
  publish: (exam: Omit<DemoExam, "id" | "published" | "studyTasks">) => {
    const created: DemoExam = { ...exam, id: "exam-" + (exams.length + 1), published: true, studyTasks: [] };
    exams.push(created);
    return created;
  },
  get: (id: string) => exams.find((exam) => exam.id === id),
  addStudyTask: (examId: string, task: Omit<DemoStudyTask, "id" | "completed">) => {
    const exam = exams.find((item) => item.id === examId);
    if (!exam) return undefined;
    const created = { ...task, id: "study-" + (exam.studyTasks.length + 1), completed: false };
    exam.studyTasks.push(created);
    return created;
  },
  completeStudyTask: (examId: string, taskId: string) => {
    const task = exams.find((exam) => exam.id === examId)?.studyTasks.find((item) => item.id === taskId);
    if (!task) return undefined;
    task.completed = true;
    return task;
  },
};
