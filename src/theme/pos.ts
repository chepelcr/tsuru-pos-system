// Centralized POS design tokens — import this instead of duplicating the object.
// All values resolve to CSS variables defined in src/index.css so theming
// (light/dark mode + future palette swaps) flows from a single source of truth.
export const POS = {
  bg:          "hsl(var(--background))",
  surface:     "hsl(var(--card))",
  card:        "hsl(var(--muted) / 0.4)",
  border:      "hsl(var(--border))",
  rose:        "hsl(var(--accent-rose))",
  roseLight:   "hsl(var(--accent-rose-soft))",
  roseDim:     "hsl(var(--accent-rose-dim))",
  roseBorder:  "hsl(var(--accent-rose-border))",
  text:        "hsl(var(--foreground))",
  muted:       "hsl(var(--muted-foreground))",
  success:     "hsl(var(--success))",
  info:        "hsl(var(--info))",
  fontDisplay: "var(--font-display)",
  fontUI:      "var(--font-sans)",
} as const;
