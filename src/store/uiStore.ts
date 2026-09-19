import { create } from 'zustand';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { MAX_VISIBLE_TABS } from './documentStore';

/**
 * Minimal shared UI-state store. Tracks whether the left dashboard sidebar is
 * collapsed — relevant because, together with viewport size, it drives how
 * many open-document tabs fit in the global navbar (DocumentsToolbar).
 * Anything beyond that count is "overflow" and only reachable through the
 * right-side DocumentsMobileDrawer.
 */
interface UIStore {
  sidebar_collapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  /**
   * How many document tabs actually FIT in the navbar right now, measured by
   * `DocumentsToolbar` rather than guessed from breakpoints.
   *
   * It lives in the store because two components need the same answer: the
   * toolbar decides what to show, and the header's drawer badge has to count
   * what it hid. `null` means nothing has measured yet — the toolbar is not
   * mounted (mobile), or the first frame has not landed.
   */
  fitting_tabs: number | null;
  setFittingTabs: (count: number | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebar_collapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebar_collapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebar_collapsed: !s.sidebar_collapsed })),
  fitting_tabs: null,
  setFittingTabs: (count) => set((s) => (s.fitting_tabs === count ? s : { fitting_tabs: count })),
}));

/**
 * How many document tabs the navbar can show — MEASURED, with a breakpoint guess
 * as the fallback.
 *
 * The guess is what this used to be, and why the last tab could end up sitting
 * under the navbar's right-hand controls: a fixed 2 or 3 assumes every tab is the
 * same width, and they are not — the label is a translated document-type name,
 * truncated at 120px but often much shorter. Two short tabs and one long one fit
 * differently from three long ones, and the guess could not tell.
 *
 * `DocumentsToolbar` now measures what actually fits and publishes it. This hook
 * prefers that number and falls back to the old estimate until the first
 * measurement lands, so nothing renders wrong on the first frame.
 *
 *  - Mobile (<769px): the toolbar is hidden, so 0 — the drawer badge then
 *    reflects the *full* open count.
 */
export function useMaxVisibleTabs(): number {
  const collapsed = useUIStore((s) => s.sidebar_collapsed);
  const measured = useUIStore((s) => s.fitting_tabs);
  const isTabletUp = useIsDesktop(769);
  const isWideDesktop = useIsDesktop(1024);

  if (!isTabletUp) return 0;
  if (measured !== null) return measured;
  if (!isWideDesktop) return collapsed ? MAX_VISIBLE_TABS - 1 : MAX_VISIBLE_TABS - 2;
  return collapsed ? MAX_VISIBLE_TABS : MAX_VISIBLE_TABS - 1;
}
