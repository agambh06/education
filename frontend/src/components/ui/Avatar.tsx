import { Avatar as MantineAvatar } from "@mantine/core";
import type { ColorTone } from "../../types/domain";

interface Props {
  initials: string;
  tone?: ColorTone;
}
const colors: Record<ColorTone, string> = {
  navy: "dark",
  coral: "red",
  sky: "blue",
  indigo: "indigo",
  blue: "blue",
  purple: "violet",
  orange: "orange",
  teal: "teal",
};
export function Avatar({ initials, tone = "navy" }: Props) {
  return (
    <MantineAvatar color={colors[tone]} radius="xl">
      {initials}
    </MantineAvatar>
  );
}
