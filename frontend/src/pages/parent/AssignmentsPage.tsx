import { Button, SimpleGrid, Tabs } from "@mantine/core";
import { AssignmentCard } from "../../components/assignments/AssignmentCard";
import { PageHeader } from "../../components/ui/PageHeader";
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
        action={<Button>{parentStrings.assignments.download}</Button>}
      />
      <Tabs value={filter} onChange={(value) => onFilterChange((value ?? "הכול") as "הכול" | AssignmentStatus)} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="הכול">הכול</Tabs.Tab>
          <Tabs.Tab value="לביצוע">לביצוע</Tabs.Tab>
          <Tabs.Tab value="הושלם">הושלם</Tabs.Tab>
          <Tabs.Tab value="באיחור">באיחור</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
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
