export function mapApiAssignment(item, statuses) {
  const isOverdue = item.status === "OVERDUE" || (item.status === "TODO" && Date.parse(item.dueAt) < Date.now());
  const status = item.status === "COMPLETED" ? statuses.completed : isOverdue ? statuses.overdue : statuses.toDo;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    dueLabel: new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.dueAt)),
    status,
    studentId: item.studentId,
    subject: item.subject.name,
    teacher: `המורה ${item.teacher.lastName}`,
    tone: "blue",
  };
}
