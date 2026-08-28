import { Avatar as MantineAvatar } from "@mantine/core";
import type { ColorTone } from "../../types/domain";
interface AvatarProps {
  initials: string;
  tone?: ColorTone;
}
export function Avatar({ initials, tone = "navy" }: AvatarProps) {
  return (
    <MantineAvatar className={"avatar " + tone} radius="xl">
      {initials}
    </MantineAvatar>
  );
}
