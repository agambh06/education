import { Alert, Button, SimpleGrid, Tabs, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { AssignmentCard } from "../../components/assignments/AssignmentCard";
import { assignmentDataStrings } from "../../components/assignments/strings";
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
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function AssignmentsPage({
  assignments,
  students,
  filter,
  onFilterChange,
  onComplete,
  loading,
  error,
  onRetry,
}: Props) {
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
      {error && (
        <Alert color="red" mb="lg" title={error}>
          <Button variant="light" size="xs" onClick={onRetry}>
            {assignmentDataStrings.retry}
          </Button>
        </Alert>
      )}
      {loading && <Text c="dimmed">{assignmentDataStrings.loading}</Text>}
      {!loading && !error && assignments.length === 0 && <Text c="dimmed">{assignmentDataStrings.empty}</Text>}
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>
        {!loading &&
          assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              studentName={assignment.studentName || studentName(assignment.studentId)}
              onComplete={onComplete}
            />
          ))}
      </SimpleGrid>
    </>
  );
}
