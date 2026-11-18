import { Modal as MantineModal } from "@mantine/core";
import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: ReactNode;
  closeButtonLabel?: string;
}
export function Modal({ children, onClose, title, closeButtonLabel }: ModalProps) {
  return (
    <MantineModal
      opened
      onClose={onClose}
      title={title}
      withCloseButton={Boolean(title)}
      closeButtonProps={{ "aria-label": closeButtonLabel, size: 44 }}
      centered
      size="lg"
      padding="clamp(var(--mantine-spacing-md), 4vw, var(--mantine-spacing-xl))"
      xOffset={8}
      yOffset={8}
      styles={{ inner: { insetInline: 0 } }}
      overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
    >
      {children}
    </MantineModal>
  );
}
