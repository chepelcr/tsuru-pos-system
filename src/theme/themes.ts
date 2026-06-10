/**
 * Per-organization theme registry.
 *
 * Nine themes: the POS default (`pollos-portenos`) plus the eight store
 * templates. Each theme provides a `light` and `dark` map of the SAME CSS
 * variable tokens defined in `src/index.css`, so `ThemeContext.applyTheme`
 * can simply write each entry onto `document.documentElement`.
 *
 * ── Token contract ─────────────────────────────────────────────────────────
 * Every map MUST define exactly the keys in `THEME_TOKENS`. Each colour value
 * is an HSL triple string ("H S% L%") — NOT wrapped in `hsl(...)` and NOT a
 * hex literal — matching how `src/index.css` declares them. The `accent-rose`
 * family carries an optional alpha suffix ("H S% L% / 0.15") exactly as the
 * base stylesheet does.
 *
 * Source of truth for each template's palette is that template's
 * `tailwind.config.*` + `src/index.css` under `templates/<name>/`. The
 * `pollos-portenos` map mirrors the current values already in
 * `src/index.css`, so selecting it is a visual no-op.
 *
 * `fonts.googleFonts` lists the family specs to lazily inject as Google Fonts
 * <link>s (see ThemeContext). Families already bundled/self-hosted (Barlow,
 * JetBrains Mono) are still listed so a theme switch back to default re-ensures
 * them; injection is deduped by href so this is cheap.
 */

export type ThemeTokenName =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "border"
  | "input"
  | "ring"
  | "sidebar"
  | "sidebar-foreground"
  | "sidebar-accent"
  | "sidebar-accent-foreground"
  | "sidebar-border"
  | "accent-rose"
  | "accent-rose-soft"
  | "accent-rose-dim"
  | "accent-rose-border";

export type ThemeVarMap = Record<ThemeTokenName, string>;

export interface ThemeFonts {
  /** Value written to `--font-sans`. */
  sans: string;
  /** Value written to `--font-display`. */
  display: string;
  /** Google Fonts family specs to lazily inject as <link>s. */
  googleFonts: string[];
}

export interface ThemeDef {
  id: string;
  /** Human-readable label (also a translation key fallback). */
  name: string;
  fonts: ThemeFonts;
  /** Value written to `--radius`. */
  radius: string;
  light: ThemeVarMap;
  dark: ThemeVarMap;
}

/** Ordered list of every token a theme map must define. */
export const THEME_TOKENS: ThemeTokenName[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "success",
  "warning",
  "info",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "accent-rose",
  "accent-rose-soft",
  "accent-rose-dim",
  "accent-rose-border",
];

// Shared status colours reused across themes (kept identical to the POS
// defaults so semantic success/warning/info read consistently everywhere).
const STATUS_LIGHT = {
  destructive: "0 72% 51%",
  success: "142 71% 40%",
  warning: "38 92% 48%",
  info: "217 91% 55%",
} as const;

const STATUS_DARK = {
  destructive: "0 72% 55%",
  success: "142 71% 50%",
  warning: "38 92% 55%",
  info: "217 91% 65%",
} as const;

// The rose accent family is shared verbatim with the base stylesheet.
const ROSE_LIGHT = {
  "accent-rose": "32 53% 64%",
  "accent-rose-soft": "32 53% 64% / 0.15",
  "accent-rose-dim": "32 53% 64% / 0.08",
  "accent-rose-border": "32 53% 64% / 0.2",
} as const;

const ROSE_DARK = {
  "accent-rose": "32 53% 64%",
  "accent-rose-soft": "32 53% 64% / 0.18",
  "accent-rose-dim": "32 53% 64% / 0.1",
  "accent-rose-border": "32 53% 64% / 0.3",
} as const;

// ─── Theme: pollos-portenos (POS default — mirrors src/index.css) ───────────
const pollosPortenos: ThemeDef = {
  id: "pollos-portenos",
  name: "Pollos Porteños",
  fonts: {
    sans: '"Barlow", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Barlow Condensed", "Barlow", "Arial Narrow", sans-serif',
    googleFonts: ["Barlow:wght@400;500;600;700;800", "Barlow+Condensed:wght@700;800"],
  },
  radius: "0.5rem",
  light: {
    background: "30 40% 98%",
    foreground: "20 14% 16%",
    card: "0 0% 100%",
    "card-foreground": "20 14% 16%",
    primary: "23 88% 47%",
    "primary-foreground": "0 0% 100%",
    secondary: "20 14% 16%",
    "secondary-foreground": "0 0% 100%",
    muted: "30 25% 94%",
    "muted-foreground": "20 8% 45%",
    accent: "23 100% 95%",
    "accent-foreground": "23 88% 35%",
    ...STATUS_LIGHT,
    border: "30 15% 88%",
    input: "30 15% 88%",
    ring: "23 88% 47%",
    sidebar: "30 25% 96%",
    "sidebar-foreground": "20 14% 16%",
    "sidebar-accent": "30 25% 92%",
    "sidebar-accent-foreground": "20 14% 16%",
    "sidebar-border": "30 15% 86%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "20 14% 8%",
    foreground: "30 20% 96%",
    card: "20 14% 12%",
    "card-foreground": "30 20% 96%",
    primary: "23 88% 52%",
    "primary-foreground": "0 0% 100%",
    secondary: "30 20% 96%",
    "secondary-foreground": "20 14% 12%",
    muted: "20 10% 18%",
    "muted-foreground": "30 10% 65%",
    accent: "23 88% 18%",
    "accent-foreground": "23 88% 75%",
    ...STATUS_DARK,
    border: "20 10% 22%",
    input: "20 10% 22%",
    ring: "23 88% 52%",
    sidebar: "20 14% 10%",
    "sidebar-foreground": "30 20% 96%",
    "sidebar-accent": "20 10% 16%",
    "sidebar-accent-foreground": "30 20% 96%",
    "sidebar-border": "20 10% 18%",
    ...ROSE_DARK,
  },
};

// ─── Theme: jmarkets (POS DEFAULT — forest green, mirrors the original
//     dashboard admin palette + src/index.css base) ───────────────────────────
const jmarkets: ThemeDef = {
  id: "jmarkets",
  name: "JMarkets",
  fonts: {
    sans: '"Barlow", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Barlow Condensed", "Barlow", "Arial Narrow", sans-serif',
    googleFonts: ["Barlow:wght@400;500;600;700;800", "Barlow+Condensed:wght@700;800"],
  },
  radius: "0.5rem",
  light: {
    background: "60 30% 97%",
    foreground: "20 14% 16%",
    card: "0 0% 100%",
    "card-foreground": "20 14% 16%",
    primary: "123 46% 34%",
    "primary-foreground": "0 0% 100%",
    secondary: "123 33% 64%",
    "secondary-foreground": "20 14% 16%",
    muted: "60 20% 94%",
    "muted-foreground": "20 10% 45%",
    accent: "123 40% 92%",
    "accent-foreground": "123 46% 24%",
    ...STATUS_LIGHT,
    border: "60 20% 86%",
    input: "60 20% 86%",
    ring: "123 46% 34%",
    sidebar: "60 20% 96%",
    "sidebar-foreground": "20 14% 16%",
    "sidebar-accent": "60 20% 92%",
    "sidebar-accent-foreground": "20 14% 16%",
    "sidebar-border": "60 20% 86%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "20 14% 8%",
    foreground: "60 30% 92%",
    card: "20 14% 12%",
    "card-foreground": "60 30% 92%",
    primary: "122 39% 49%",
    "primary-foreground": "0 0% 100%",
    secondary: "123 33% 64%",
    "secondary-foreground": "20 14% 8%",
    muted: "20 10% 18%",
    "muted-foreground": "60 10% 60%",
    accent: "123 30% 20%",
    "accent-foreground": "123 40% 80%",
    ...STATUS_DARK,
    border: "20 10% 20%",
    input: "20 10% 20%",
    ring: "122 39% 49%",
    sidebar: "20 14% 10%",
    "sidebar-foreground": "60 30% 92%",
    "sidebar-accent": "20 10% 16%",
    "sidebar-accent-foreground": "60 30% 92%",
    "sidebar-border": "20 10% 18%",
    ...ROSE_DARK,
  },
};

// ─── Theme: jmarkets-demo (Orange / Blue) ───────────────────────────────────
const jmarketsDemo: ThemeDef = {
  id: "jmarkets-demo",
  name: "JMarkets Demo",
  fonts: {
    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
    display: '"Inter", ui-sans-serif, system-ui, sans-serif',
    googleFonts: ["Inter:wght@400;500;600;700;800"],
  },
  radius: "0.5rem",
  light: {
    background: "0 0% 100%",
    foreground: "222 47% 11%",
    card: "0 0% 100%",
    "card-foreground": "222 47% 11%",
    primary: "24 95% 53%",
    "primary-foreground": "0 0% 100%",
    secondary: "222 74% 40%",
    "secondary-foreground": "0 0% 100%",
    muted: "210 40% 96%",
    "muted-foreground": "215 16% 47%",
    accent: "43 96% 56%",
    "accent-foreground": "26 83% 14%",
    ...STATUS_LIGHT,
    border: "214 32% 91%",
    input: "214 32% 91%",
    ring: "24 95% 53%",
    sidebar: "210 40% 98%",
    "sidebar-foreground": "222 47% 11%",
    "sidebar-accent": "210 40% 94%",
    "sidebar-accent-foreground": "222 47% 11%",
    "sidebar-border": "214 32% 91%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "222 47% 11%",
    foreground: "210 40% 98%",
    card: "222 47% 14%",
    "card-foreground": "210 40% 98%",
    primary: "24 95% 53%",
    "primary-foreground": "0 0% 100%",
    secondary: "222 74% 40%",
    "secondary-foreground": "0 0% 100%",
    muted: "217 33% 17%",
    "muted-foreground": "215 20% 65%",
    accent: "43 96% 56%",
    "accent-foreground": "26 83% 14%",
    ...STATUS_DARK,
    border: "217 33% 17%",
    input: "217 33% 17%",
    ring: "24 95% 53%",
    sidebar: "222 47% 9%",
    "sidebar-foreground": "210 40% 98%",
    "sidebar-accent": "217 33% 17%",
    "sidebar-accent-foreground": "210 40% 98%",
    "sidebar-border": "217 33% 17%",
    ...ROSE_DARK,
  },
};

// ─── Theme: tech-gadgets (Blue / Cyan — dark-first) ─────────────────────────
const techGadgets: ThemeDef = {
  id: "tech-gadgets",
  name: "Tech Gadgets",
  fonts: {
    sans: '"Roboto", system-ui, sans-serif',
    display: '"Roboto", system-ui, sans-serif',
    googleFonts: ["Roboto:wght@400;500;700;900", "Roboto+Mono:wght@400;500;700"],
  },
  radius: "0.25rem",
  // Template ships dark-by-default in :root and a `.light` override. We map the
  // template's `.light` palette to our `light` and its `:root` (dark) to `dark`.
  light: {
    background: "0 0% 100%",
    foreground: "222 47% 11%",
    card: "0 0% 100%",
    "card-foreground": "222 47% 11%",
    primary: "221 83% 53%",
    "primary-foreground": "210 40% 96%",
    secondary: "188 85% 43%",
    "secondary-foreground": "222 47% 11%",
    muted: "210 40% 96%",
    "muted-foreground": "215 16% 47%",
    accent: "217 91% 60%",
    "accent-foreground": "210 40% 96%",
    ...STATUS_LIGHT,
    border: "214 32% 91%",
    input: "214 32% 91%",
    ring: "188 85% 43%",
    sidebar: "210 40% 98%",
    "sidebar-foreground": "222 47% 11%",
    "sidebar-accent": "210 40% 94%",
    "sidebar-accent-foreground": "222 47% 11%",
    "sidebar-border": "214 32% 91%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "222 47% 11%",
    foreground: "210 40% 96%",
    card: "215 25% 26%",
    "card-foreground": "210 40% 96%",
    primary: "221 83% 53%",
    "primary-foreground": "210 40% 96%",
    secondary: "188 85% 43%",
    "secondary-foreground": "222 47% 11%",
    muted: "217 33% 17%",
    "muted-foreground": "215 14% 55%",
    accent: "217 91% 60%",
    "accent-foreground": "210 40% 96%",
    ...STATUS_DARK,
    border: "215 16% 35%",
    input: "215 16% 35%",
    ring: "188 85% 43%",
    sidebar: "217 33% 13%",
    "sidebar-foreground": "210 40% 96%",
    "sidebar-accent": "215 25% 22%",
    "sidebar-accent-foreground": "210 40% 96%",
    "sidebar-border": "215 16% 30%",
    ...ROSE_DARK,
  },
};

// ─── Theme: vintage-fashion (Burgundy / Mustard / Cream) ────────────────────
const vintageFashion: ThemeDef = {
  id: "vintage-fashion",
  name: "Vintage Fashion",
  fonts: {
    sans: '"Lora", Georgia, serif',
    display: '"Playfair Display", Georgia, serif',
    googleFonts: ["Playfair+Display:wght@600;700;800", "Lora:wght@400;500;600;700"],
  },
  radius: "0.375rem",
  light: {
    background: "48 100% 96%",
    foreground: "60 9% 18%",
    card: "45 87% 94%",
    "card-foreground": "60 9% 18%",
    primary: "338 81% 29%",
    "primary-foreground": "48 96% 89%",
    secondary: "45 93% 47%",
    "secondary-foreground": "338 81% 29%",
    muted: "45 87% 94%",
    "muted-foreground": "60 5% 52%",
    accent: "350 89% 60%",
    "accent-foreground": "48 96% 89%",
    ...STATUS_LIGHT,
    border: "45 46% 90%",
    input: "45 46% 90%",
    ring: "338 81% 29%",
    sidebar: "45 80% 92%",
    "sidebar-foreground": "60 9% 18%",
    "sidebar-accent": "45 70% 88%",
    "sidebar-accent-foreground": "338 81% 29%",
    "sidebar-border": "45 46% 86%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "24 10% 10%",
    foreground: "48 96% 89%",
    card: "24 10% 14%",
    "card-foreground": "48 96% 89%",
    primary: "338 81% 29%",
    "primary-foreground": "48 96% 89%",
    secondary: "45 93% 47%",
    "secondary-foreground": "338 81% 29%",
    muted: "24 10% 20%",
    "muted-foreground": "48 46% 70%",
    accent: "350 89% 60%",
    "accent-foreground": "48 96% 89%",
    ...STATUS_DARK,
    border: "24 10% 20%",
    input: "24 10% 20%",
    ring: "45 93% 47%",
    sidebar: "24 10% 8%",
    "sidebar-foreground": "48 96% 89%",
    "sidebar-accent": "24 10% 16%",
    "sidebar-accent-foreground": "48 96% 89%",
    "sidebar-border": "24 10% 18%",
    ...ROSE_DARK,
  },
};

// ─── Theme: artisan-crafts (Terracotta / Forest / Gold — hex→HSL converted) ─
const artisanCrafts: ThemeDef = {
  id: "artisan-crafts",
  name: "Artisan Crafts",
  fonts: {
    sans: '"Merriweather", Georgia, serif',
    display: '"Josefin Sans", ui-sans-serif, sans-serif',
    googleFonts: ["Josefin+Sans:wght@400;500;600;700", "Merriweather:wght@400;700"],
  },
  radius: "1rem",
  light: {
    background: "48 100% 96%",
    foreground: "12 6% 15%",
    card: "0 0% 100%",
    "card-foreground": "12 6% 15%",
    primary: "21 90% 48%",
    "primary-foreground": "0 0% 100%",
    secondary: "142 72% 29%",
    "secondary-foreground": "0 0% 100%",
    muted: "48 96% 89%",
    "muted-foreground": "33 5% 32%",
    accent: "41 96% 40%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_LIGHT,
    border: "20 6% 90%",
    input: "20 6% 90%",
    ring: "21 90% 48%",
    sidebar: "48 90% 93%",
    "sidebar-foreground": "12 6% 15%",
    "sidebar-accent": "48 96% 89%",
    "sidebar-accent-foreground": "12 6% 15%",
    "sidebar-border": "20 6% 86%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "24 10% 10%",
    foreground: "48 100% 96%",
    card: "24 10% 14%",
    "card-foreground": "48 100% 96%",
    primary: "21 90% 48%",
    "primary-foreground": "0 0% 100%",
    secondary: "142 72% 36%",
    "secondary-foreground": "0 0% 100%",
    muted: "24 10% 20%",
    "muted-foreground": "33 8% 62%",
    accent: "41 96% 50%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_DARK,
    border: "24 10% 22%",
    input: "24 10% 22%",
    ring: "21 90% 48%",
    sidebar: "24 10% 8%",
    "sidebar-foreground": "48 100% 96%",
    "sidebar-accent": "24 10% 16%",
    "sidebar-accent-foreground": "48 100% 96%",
    "sidebar-border": "24 10% 18%",
    ...ROSE_DARK,
  },
};

// ─── Theme: gourmet-foods (Red / Green / Gold) ──────────────────────────────
const gourmetFoods: ThemeDef = {
  id: "gourmet-foods",
  name: "Gourmet Foods",
  fonts: {
    sans: '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Playfair Display", Georgia, serif',
    googleFonts: ["Playfair+Display:wght@600;700;800", "Source+Sans+Pro:wght@400;600;700"],
  },
  radius: "0.5rem",
  light: {
    background: "0 0% 100%",
    foreground: "24 10% 10%",
    card: "0 0% 100%",
    "card-foreground": "24 10% 10%",
    primary: "0 84% 60%",
    "primary-foreground": "0 0% 100%",
    secondary: "145 80% 25%",
    "secondary-foreground": "0 0% 100%",
    muted: "60 5% 96%",
    "muted-foreground": "25 5% 45%",
    accent: "32 95% 44%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_LIGHT,
    border: "20 6% 90%",
    input: "60 5% 96%",
    ring: "0 84% 60%",
    sidebar: "60 5% 97%",
    "sidebar-foreground": "24 10% 10%",
    "sidebar-accent": "60 5% 93%",
    "sidebar-accent-foreground": "24 10% 10%",
    "sidebar-border": "20 6% 88%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "24 10% 10%",
    foreground: "60 5% 96%",
    card: "24 10% 12%",
    "card-foreground": "60 5% 96%",
    primary: "0 84% 60%",
    "primary-foreground": "0 0% 100%",
    secondary: "145 80% 35%",
    "secondary-foreground": "0 0% 100%",
    muted: "25 5% 20%",
    "muted-foreground": "25 5% 60%",
    accent: "32 95% 54%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_DARK,
    border: "25 5% 25%",
    input: "25 5% 20%",
    ring: "0 84% 60%",
    sidebar: "24 10% 8%",
    "sidebar-foreground": "60 5% 96%",
    "sidebar-accent": "25 5% 18%",
    "sidebar-accent-foreground": "60 5% 96%",
    "sidebar-border": "25 5% 22%",
    ...ROSE_DARK,
  },
};

// ─── Theme: fitness-hub (Red / Orange / Near-black) ─────────────────────────
const fitnessHub: ThemeDef = {
  id: "fitness-hub",
  name: "Fitness Hub",
  fonts: {
    sans: '"Montserrat", ui-sans-serif, sans-serif',
    display: '"Montserrat", ui-sans-serif, sans-serif',
    googleFonts: ["Montserrat:wght@400;500;600;700;800;900"],
  },
  radius: "0.5rem",
  light: {
    background: "0 0% 100%",
    foreground: "0 0% 4%",
    card: "0 0% 100%",
    "card-foreground": "0 0% 4%",
    primary: "0 72% 51%",
    "primary-foreground": "0 0% 100%",
    secondary: "20 91% 48%",
    "secondary-foreground": "0 0% 100%",
    muted: "0 0% 96%",
    "muted-foreground": "0 0% 45%",
    accent: "0 0% 4%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_LIGHT,
    border: "0 0% 90%",
    input: "0 0% 90%",
    ring: "0 72% 51%",
    sidebar: "0 0% 97%",
    "sidebar-foreground": "0 0% 4%",
    "sidebar-accent": "0 0% 92%",
    "sidebar-accent-foreground": "0 0% 4%",
    "sidebar-border": "0 0% 88%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "0 0% 4%",
    foreground: "0 0% 98%",
    card: "222 47% 11%",
    "card-foreground": "0 0% 98%",
    primary: "0 72% 51%",
    "primary-foreground": "0 0% 100%",
    secondary: "20 91% 48%",
    "secondary-foreground": "0 0% 100%",
    muted: "217 33% 17%",
    "muted-foreground": "215 20% 65%",
    accent: "222 47% 11%",
    "accent-foreground": "0 0% 98%",
    ...STATUS_DARK,
    border: "217 33% 17%",
    input: "217 33% 17%",
    ring: "0 72% 51%",
    sidebar: "0 0% 6%",
    "sidebar-foreground": "0 0% 98%",
    "sidebar-accent": "217 33% 14%",
    "sidebar-accent-foreground": "0 0% 98%",
    "sidebar-border": "217 33% 17%",
    ...ROSE_DARK,
  },
};

// ─── Theme: pet-care (Blue / Orange / Green — soft sky) ──────────────────────
const petCare: ThemeDef = {
  id: "pet-care",
  name: "Pet Care",
  fonts: {
    sans: '"Nunito", ui-sans-serif, sans-serif',
    display: '"Nunito", ui-sans-serif, sans-serif',
    googleFonts: ["Nunito:wght@400;500;600;700;800;900"],
  },
  radius: "1rem",
  light: {
    background: "204 100% 97%",
    foreground: "215 25% 27%",
    card: "0 0% 100%",
    "card-foreground": "215 25% 27%",
    primary: "221 83% 53%",
    "primary-foreground": "0 0% 100%",
    secondary: "20 91% 54%",
    "secondary-foreground": "0 0% 100%",
    muted: "210 40% 96%",
    "muted-foreground": "215 16% 47%",
    accent: "142 71% 45%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_LIGHT,
    border: "214 32% 91%",
    input: "214 32% 91%",
    ring: "221 83% 53%",
    sidebar: "204 80% 95%",
    "sidebar-foreground": "215 25% 27%",
    "sidebar-accent": "204 70% 91%",
    "sidebar-accent-foreground": "215 25% 27%",
    "sidebar-border": "214 32% 88%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "222 47% 11%",
    foreground: "210 40% 98%",
    card: "222 47% 15%",
    "card-foreground": "210 40% 98%",
    primary: "217 91% 60%",
    "primary-foreground": "222 47% 11%",
    secondary: "24 100% 60%",
    "secondary-foreground": "222 47% 11%",
    muted: "217 33% 17%",
    "muted-foreground": "215 20% 65%",
    accent: "142 76% 36%",
    "accent-foreground": "210 40% 98%",
    ...STATUS_DARK,
    border: "217 33% 17%",
    input: "217 33% 17%",
    ring: "217 91% 60%",
    sidebar: "222 47% 9%",
    "sidebar-foreground": "210 40% 98%",
    "sidebar-accent": "217 33% 17%",
    "sidebar-accent-foreground": "210 40% 98%",
    "sidebar-border": "217 33% 17%",
    ...ROSE_DARK,
  },
};

// ─── Theme: beauty-essentials (Pink / Soft-pink / Coral) ────────────────────
const beautyEssentials: ThemeDef = {
  id: "beauty-essentials",
  name: "Beauty Essentials",
  fonts: {
    sans: '"Nunito", ui-sans-serif, sans-serif',
    display: '"Playfair Display", Georgia, serif',
    googleFonts: ["Nunito:wght@400;500;600;700;800", "Playfair+Display:wght@600;700"],
  },
  radius: "1.3rem",
  light: {
    background: "0 0% 100%",
    foreground: "210 25% 8%",
    card: "180 7% 97%",
    "card-foreground": "210 25% 8%",
    primary: "340 82% 52%",
    "primary-foreground": "0 0% 100%",
    secondary: "330 81% 84%",
    "secondary-foreground": "340 82% 20%",
    muted: "240 2% 90%",
    "muted-foreground": "210 12% 38%",
    accent: "334 100% 69%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_LIGHT,
    border: "201 30% 91%",
    input: "200 23% 97%",
    ring: "340 82% 52%",
    sidebar: "180 7% 96%",
    "sidebar-foreground": "210 25% 8%",
    "sidebar-accent": "330 60% 92%",
    "sidebar-accent-foreground": "340 82% 20%",
    "sidebar-border": "201 30% 89%",
    ...ROSE_LIGHT,
  },
  dark: {
    background: "210 25% 8%",
    foreground: "0 0% 98%",
    card: "210 22% 12%",
    "card-foreground": "0 0% 98%",
    primary: "340 82% 56%",
    "primary-foreground": "0 0% 100%",
    secondary: "330 50% 40%",
    "secondary-foreground": "0 0% 98%",
    muted: "210 18% 18%",
    "muted-foreground": "210 12% 65%",
    accent: "334 100% 69%",
    "accent-foreground": "0 0% 100%",
    ...STATUS_DARK,
    border: "210 18% 22%",
    input: "210 18% 18%",
    ring: "340 82% 56%",
    sidebar: "210 25% 6%",
    "sidebar-foreground": "0 0% 98%",
    "sidebar-accent": "210 18% 16%",
    "sidebar-accent-foreground": "0 0% 98%",
    "sidebar-border": "210 18% 20%",
    ...ROSE_DARK,
  },
};

/** All themes keyed by id. */
export const THEMES: Record<string, ThemeDef> = {
  "jmarkets": jmarkets,
  "pollos-portenos": pollosPortenos,
  "jmarkets-demo": jmarketsDemo,
  "tech-gadgets": techGadgets,
  "vintage-fashion": vintageFashion,
  "artisan-crafts": artisanCrafts,
  "gourmet-foods": gourmetFoods,
  "fitness-hub": fitnessHub,
  "pet-care": petCare,
  "beauty-essentials": beautyEssentials,
};

/** Ordered theme list for galleries — default first. */
export const THEME_LIST: ThemeDef[] = [
  jmarkets,
  pollosPortenos,
  jmarketsDemo,
  techGadgets,
  vintageFashion,
  artisanCrafts,
  gourmetFoods,
  fitnessHub,
  petCare,
  beautyEssentials,
];

/** The fallback theme id when an org has no theme / an unknown one. */
export const DEFAULT_THEME_ID = "jmarkets";

/** Type guard: is `id` a known theme id? */
export function isKnownThemeId(id: string | undefined | null): id is string {
  return !!id && id in THEMES;
}
