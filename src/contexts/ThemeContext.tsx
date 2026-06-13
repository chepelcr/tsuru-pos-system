import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useDarkMode } from "@/hooks/useDarkMode";
import {
  THEMES,
  THEME_TOKENS,
  DEFAULT_THEME_ID,
  isKnownThemeId,
  type ThemeDef,
} from "@/theme/themes";

const STORAGE_KEY = "pos.themeId";

interface ThemeContextValue {
  /** The active theme id (always a known id). */
  themeId: string;
  /** The resolved theme definition. */
  theme: ThemeDef;
  /** Override the active theme (for instant live apply on selection). */
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read the first-paint theme id from localStorage so the very first render
 * already applies the right palette (avoids a flash of the default theme while
 * the org query resolves).
 */
function readStoredThemeId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isKnownThemeId(stored)) return stored;
  } catch {
    /* localStorage unavailable (SSR / privacy mode) — fall through */
  }
  return DEFAULT_THEME_ID;
}

/**
 * Lazily inject the Google Font <link>s a theme needs into <head>. Deduped by
 * href so repeated theme switches don't pile up duplicate links.
 */
const injectedFontHrefs = new Set<string>();

function ensureGoogleFonts(families: string[]): void {
  if (typeof document === "undefined" || families.length === 0) return;
  const query = families.map((f) => `family=${f}`).join("&");
  const href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  if (injectedFontHrefs.has(href)) return;
  if (document.querySelector(`link[href="${href}"]`)) {
    injectedFontHrefs.add(href);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  injectedFontHrefs.add(href);
}

/**
 * Write a theme's variable map onto :root for the given mode, plus fonts and
 * radius, and ensure the theme's web fonts are loaded.
 */
function applyTheme(themeId: string, isDark: boolean): void {
  if (typeof document === "undefined") return;
  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];
  const root = document.documentElement;
  const vars = isDark ? theme.dark : theme.light;

  for (const token of THEME_TOKENS) {
    root.style.setProperty(`--${token}`, vars[token]);
  }

  root.style.setProperty("--font-sans", theme.fonts.sans);
  root.style.setProperty("--font-display", theme.fonts.display);
  root.style.setProperty("--radius", theme.radius);

  ensureGoogleFonts(theme.fonts.googleFonts);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { useDefaultOrganization, useOrgTheme } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  // Dedicated theme read: GET /configurations/theme → `{ theme: string|null }`
  // from organization_settings.theme (independent of the Hacienda config, which
  // 404s and omits theme). `themeData` is undefined until resolved.
  const { data: themeData } = useOrgTheme(org?.id);
  const { dark } = useDarkMode();

  // Manual override (set when the user picks a theme in the gallery). Takes
  // precedence over the org-derived theme until the next mount / org change.
  const [override, setOverride] = useState<string | null>(null);

  // Resolve the org's theme from the dedicated theme read (PATCHed via
  // useUpdateOrgTheme): explicit `theme` field, else the POS default.
  // (No longer read from org.theme on the markets-api, nor from the Hacienda
  // config response.)
  const orgThemeId = useMemo(() => {
    if (isKnownThemeId(themeData?.theme)) return themeData!.theme!;
    return DEFAULT_THEME_ID;
  }, [themeData?.theme]);

  // First paint uses the stored id; thereafter prefer override → theme → default.
  // On the /login page there's no org, so `themeData` stays undefined and the
  // last-applied theme from localStorage (written below) is shown.
  const themeId = override ?? (themeData ? orgThemeId : readStoredThemeId());

  const setThemeId = useCallback((id: string) => {
    const resolved = isKnownThemeId(id) ? id : DEFAULT_THEME_ID;
    setOverride(resolved);
  }, []);

  // When the org-derived theme changes (e.g. the update mutation refetches the
  // org), drop the manual override so the persisted value becomes the source of
  // truth again.
  const prevOrgThemeId = useRef(orgThemeId);
  useEffect(() => {
    if (prevOrgThemeId.current !== orgThemeId) {
      prevOrgThemeId.current = orgThemeId;
      setOverride(null);
    }
  }, [orgThemeId]);

  // Apply on every change to the resolved theme or dark mode. Mirror to
  // localStorage for instant first paint next load.
  useEffect(() => {
    applyTheme(themeId, dark);
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      /* ignore persistence failures */
    }
  }, [themeId, dark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID],
      setThemeId,
    }),
    [themeId, setThemeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
