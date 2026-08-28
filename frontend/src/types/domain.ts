export type Role = "parent" | "student" | "teacher" | "admin";
export type AssignmentStatus = "לביצוע" | "הושלם" | "באיחור";
export type ColorTone = "navy" | "coral" | "sky" | "indigo" | "blue" | "purple" | "orange" | "teal";
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  email: string;
  initials: string;
}
export interface Parent extends User {
  role: "parent";
  studentIds: string[];
}
export interface Teacher extends User {
  role: "teacher";
  subject: string;
  classIds: string[];
}
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classId: string;
  initials: string;
  tone: ColorTone;
}
export interface SchoolClass {
  id: string;
  name: string;
  subject?: string;
  studentCount: number;
}
export interface Assignment {
  id: string;
  studentId: string;
  subject: string;
  teacher: string;
  title: string;
  dueLabel: string;
  status: AssignmentStatus;
  description: string;
  tone: ColorTone;
}
export interface Exam {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  teacher: string;
  dateLabel: string;
  time: string;
}
export interface Message {
  id: string;
  teacher: string;
  initials: string;
  preview: string;
  body: string;
  sentAt: string;
  unread?: boolean;
}
export interface Notification {
  id: string;
  type: "assignment" | "exam" | "announcement";
  title: string;
  detail: string;
  dateLabel: string;
  studentName: string;
  tone: ColorTone;
}
export type TaskSource = "SCHOOL" | "PARENT" | "STUDY_PLAN";
export interface StudyTask {
  id: string;
  studentId: string;
  examId?: string;
  title: string;
  dueLabel: string;
  durationMinutes?: number;
  completed: boolean;
  source: TaskSource;
}
export type AppPage =
  | "סקירה"
  | "משימות"
  | "מבחנים"
  | "לוח שנה"
  | "הודעות"
  | "הכיתות שלי"
  | "תלמידים"
  | "צוות"
  | "עדכונים"
  | "הגדרות";
