import { AVATAR_COLORS } from "@/theme/avatarColors";

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "?"
  );
}

export function avatarColor(name: string | null | undefined): readonly [string, string] {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];
}
