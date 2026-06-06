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
}

export const useUIStore = create<UIStore>((set) => ({
  sidebar_collapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebar_collapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebar_collapsed: !s.sidebar_collapsed })),
}));

/**
 * Returns the number of document tabs that fit in the global navbar at the
 * current viewport + sidebar state.
 *
 *  - Mobile (<769px):    toolbar hidden — returns 0 so the drawer-toggle
 *                        badge reflects the *full* open count.
 *  - Tablet (769-1023):  sidebar collapsed → 2 tabs, sidebar open → 1 tab
 *                        (the open sidebar eats too much horizontal room to
 *                        fit a second tab cleanly at this width).
 *  - Desktop (≥1024px):  sidebar collapsed → 3 tabs, sidebar open → 2 tabs.
 *
 * Tabs beyond this index live in the right-side DocumentsMobileDrawer.
 */
export function useMaxVisibleTabs(): number {
  const collapsed = useUIStore((s) => s.sidebar_collapsed);
  const isTabletUp = useIsDesktop(769);
  const isWideDesktop = useIsDesktop(1024);
  if (!isTabletUp) return 0;
  if (!isWideDesktop) return collapsed ? MAX_VISIBLE_TABS - 1 : MAX_VISIBLE_TABS - 2;
  return collapsed ? MAX_VISIBLE_TABS : MAX_VISIBLE_TABS - 1;
}
