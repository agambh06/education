import { Button, Group, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { IconPaperclip, IconPlus } from "@tabler/icons-react";
import { Modal } from "../ui/Modal";
import { assignmentStrings } from "./strings";

interface Props {
  onClose: () => void;
  onPublish: () => void;
}

export function CreateAssignmentModal({ onClose, onPublish }: Props) {
  const forms = assignmentStrings;

  return (
    <Modal onClose={onClose} title={forms.createTitle} closeButtonLabel={forms.close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onPublish();
        }}
      >
        <Stack>
          <TextInput label={forms.titleLabel} placeholder={forms.titlePlaceholder} required />
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <Select label={forms.subjectLabel} defaultValue={forms.subjects[0]} data={forms.subjects} />
            <Select label={forms.classLabel} defaultValue={forms.classes[0]} data={forms.classes} />
          </SimpleGrid>
          <Textarea label={forms.descriptionLabel} placeholder={forms.descriptionPlaceholder} minRows={3} />
          <SimpleGrid cols={{ base: 1, xs: 2 }} verticalSpacing="md" style={{ alignItems: "end" }}>
            <TextInput label={forms.dueDateLabel} type="date" required />
            <Button variant="light" leftSection={<IconPaperclip size={18} stroke={1.75} aria-hidden="true" />}>
              {forms.addFile}
            </Button>
          </Group>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              {forms.saveDraft}
            </Button>
            <Button type="submit" leftSection={<IconPlus size={18} stroke={1.75} aria-hidden="true" />}>
              {forms.publish}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
