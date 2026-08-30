import { Modal as MantineModal } from "@mantine/core";
import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
}
export function Modal({ children, onClose }: ModalProps) {
  return (
    <MantineModal
      opened
      onClose={onClose}
      withCloseButton={false}
      centered
      size="lg"
      padding={0}
      overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
    >
      {children}
    </MantineModal>
  );
}
