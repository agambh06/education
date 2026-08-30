import { Button, Group, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { Modal } from "../ui/Modal";
import { assignmentStrings } from "./strings";

interface Props {
  onClose: () => void;
  onPublish: () => void;
}

export function CreateAssignmentModal({ onClose, onPublish }: Props) {
  const forms = assignmentStrings;

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onPublish();
        }}
      >
        <Stack p="xl">
          <TextInput label={forms.titleLabel} placeholder={forms.titlePlaceholder} required />
          <Group grow align="flex-start">
            <Select label={forms.subjectLabel} defaultValue={forms.subjects[0]} data={forms.subjects} />
            <Select label={forms.classLabel} defaultValue={forms.classes[0]} data={forms.classes} />
          </Group>
          <Textarea label={forms.descriptionLabel} placeholder={forms.descriptionPlaceholder} minRows={3} />
          <Group grow align="flex-end">
            <TextInput label={forms.dueDateLabel} type="date" required />
            <Button variant="light">{forms.addFile}</Button>
          </Group>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              {forms.saveDraft}
            </Button>
            <Button type="submit">{forms.publish}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
