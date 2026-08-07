/** Canonical hex values persisted by storefront/content editors. */
export const EDITOR_COLORS = {
  black: "#000000",
  white: "#ffffff",
  darkText: "#1a1a1a",
  categoryBackground: "#fce7f3",
  brandPrimary: "#e91e63",
  brandSecondary: "#9c27b0",
} as const;

export const DEFAULT_COLOR_VALUE = JSON.stringify({
  mode: "single",
  value: EDITOR_COLORS.black,
});

export const DEFAULT_BACKGROUND_VALUE = JSON.stringify({
  type: "color",
  value: EDITOR_COLORS.white,
  mode: "both",
});
