import { Button, SimpleGrid, Tabs } from "@mantine/core";
import { AssignmentCard } from "../../components/assignments/AssignmentCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { commonStrings } from "../../shared/strings/common";
import type { Assignment, AssignmentStatus, Student } from "../../types/domain";
import { parentStrings } from "./strings";

interface Props {
  assignments: Assignment[];
  students: Student[];
  filter: "הכול" | AssignmentStatus;
  onFilterChange: (filter: "הכול" | AssignmentStatus) => void;
  onComplete: (id: string) => void;
}
export function AssignmentsPage({ assignments, students, filter, onFilterChange, onComplete }: Props) {
  const studentName = (id: string) => students.find((student) => student.id === id)?.firstName ?? "";
  return (
    <>
      <PageHeader
        eyebrow={parentStrings.assignments.eyebrow}
        title={parentStrings.assignments.title}
        description={parentStrings.assignments.description}
        action={<Button mih={{ base: 44, sm: 36 }}>{parentStrings.assignments.download}</Button>}
      />
      <Tabs value={filter} onChange={(value) => onFilterChange((value ?? "הכול") as "הכול" | AssignmentStatus)} mb="lg">
        <Tabs.List grow>
          <Tabs.Tab value={commonStrings.all} mih={44} px="xs">
            {commonStrings.all}
          </Tabs.Tab>
          <Tabs.Tab value={commonStrings.toDo} mih={44} px="xs">
            {commonStrings.toDo}
          </Tabs.Tab>
          <Tabs.Tab value={commonStrings.completed} mih={44} px="xs">
            {commonStrings.completed}
          </Tabs.Tab>
          <Tabs.Tab value={commonStrings.overdue} mih={44} px="xs">
            {commonStrings.overdue}
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            studentName={studentName(assignment.studentId)}
            onComplete={onComplete}
          />
        ))}
      </SimpleGrid>
    </>
  );
}
