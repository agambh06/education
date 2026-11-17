import { Button, SimpleGrid, Tabs } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
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
        action={
          <Button leftSection={<IconDownload size={18} stroke={1.75} aria-hidden="true" />}>
            {parentStrings.assignments.download}
          </Button>
        }
      />
      <Tabs
        value={filter}
        onChange={(value) => onFilterChange((value ?? commonStrings.all) as "הכול" | AssignmentStatus)}
        mb="lg"
      >
        <Tabs.List>
          <Tabs.Tab value={commonStrings.all}>{commonStrings.all}</Tabs.Tab>
          <Tabs.Tab value={commonStrings.toDo}>{commonStrings.toDo}</Tabs.Tab>
          <Tabs.Tab value={commonStrings.completed}>{commonStrings.completed}</Tabs.Tab>
          <Tabs.Tab value={commonStrings.overdue}>{commonStrings.overdue}</Tabs.Tab>
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
