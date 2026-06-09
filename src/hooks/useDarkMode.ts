import { create } from "zustand";

/**
 * Dark mode as a SHARED store (not per-component useState).
 *
 * Previously this was a plain `useState` hook, so every caller (AuthNavbar,
 * DashboardHeader, ThemeProvider, …) got its OWN independent `dark` state.
 * When one toggled, the others never saw it — most importantly `ThemeProvider`,
 * whose `applyTheme()` writes the palette as INLINE vars on <html> that
 * override the `.dark` class. The result: toggling dark on a page whose toggle
 * lived in a different component (e.g. the login AuthNavbar) flipped the class
 * but `ThemeProvider` never re-applied the dark palette, so nothing changed.
 *
 * A single store fixes it: every consumer shares one `dark` value, so a toggle
 * anywhere re-renders ThemeProvider and re-applies the correct light/dark map.
 */

function applyDarkClass(dark: boolean): void {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* localStorage unavailable (privacy mode) — class still toggled */
  }
}

function initialDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

interface DarkModeState {
  dark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

const useDarkModeStore = create<DarkModeState>((set, get) => ({
  dark: initialDark(),
  toggle: () => {
    const next = !get().dark;
    applyDarkClass(next);
    set({ dark: next });
  },
  setDark: (dark: boolean) => {
    applyDarkClass(dark);
    set({ dark });
  },
}));

// Ensure the `.dark` class matches the initial store state on first load.
applyDarkClass(useDarkModeStore.getState().dark);

/** `{ dark, toggle }` — backed by a shared store so all consumers stay in sync. */
export function useDarkMode() {
  const dark = useDarkModeStore((s) => s.dark);
  const toggle = useDarkModeStore((s) => s.toggle);
  return { dark, toggle };
}
