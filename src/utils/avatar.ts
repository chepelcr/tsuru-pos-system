const AVATAR_COLORS: [string, string][] = [
  ["#D4A874", "#1C1410"],
  ["#64D2FF", "#0A1A22"],
  ["#32D74B", "#0A1A0A"],
  ["#FF9F0A", "#1C1205"],
  ["#BF5AF2", "#150A1C"],
  ["#FF453A", "#1C0A0A"],
];

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

export function avatarColor(name: string | null | undefined): [string, string] {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];
}
