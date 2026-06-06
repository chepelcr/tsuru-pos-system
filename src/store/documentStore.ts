import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InvoiceFormData, DocTypeCode } from '@/types/invoice';
import type { ClientSearchResult } from '@/hooks/useClientSearch';

/**
 * Maximum number of document tabs visible in the desktop/tablet navbar
 * (DocumentsToolbar). Any tab beyond this count is "overflow" and only
 * reachable via the right-side DocumentsMobileDrawer.
 *
 * When the user picks an overflow tab from the drawer, we swap it into
 * the last visible slot so it appears selected in the toolbar — see
 * `promoteTabToVisible`.
 */
export const MAX_VISIBLE_TABS = 3;

// Cart item structure (matching cart store)
interface CartItem {
  product: any;
  qty: number;
  lineDiscount?: number;
  lineNote?: string;
  lineDetail?: any;
}

export interface DocumentTab {
  id: string;
  type: 'new' | 'existing';
  title: string;
  doc_type: DocTypeCode;
  /** Invoice form state — receiver, references, payments, copy_emails, sale_condition_id, currency_code, etc. */
  data?: Partial<InvoiceFormData>;
  is_dirty?: boolean;
  opened_at?: number;
  /** Cart state per tab — hydrated/saved by POSIntegratedPage on tab activation */
  cart_items?: Record<string, CartItem>;
  /** Selected client for this tab — drives CartSidebar pill and receiver drawer pre-fill */
  selected_client?: ClientSearchResult | null;
}

interface DocumentStore {
  /** Open document tabs (drafts being edited) */
  open_documents: DocumentTab[];
  /** Active tab id — mirrors the URL when on /dashboard/documents/new/:tabId */
  active_document_tab: string | null;
  /** List filter: Emitidos (false) vs Recibidos (true) */
  is_received: boolean;

  // Tab actions
  addDocumentTab: (tab: DocumentTab) => void;
  removeDocumentTab: (id: string) => void;
  setActiveDocumentTab: (id: string | null) => void;
  updateDocumentTab: (id: string, patch: Partial<DocumentTab>) => void;
  closeAllTabs: () => void;
  /**
   * Move an "overflow" tab (index ≥ maxVisible) into the visible window by
   * swapping it with the tab currently at the last visible slot. No-op if
   * the tab is already visible or not found.
   */
  promoteTabToVisible: (id: string, maxVisible: number) => void;

  // List filter
  setIsReceived: (received: boolean) => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set) => ({
      open_documents: [],
      active_document_tab: null,
      is_received: false,

      addDocumentTab: (tab) => {
        set((state) => {
          const newTab = { ...tab, cart_items: {} };
          const docs = state.open_documents;
          // When the visible window is already full, insert the new tab at the
          // last visible slot so it appears in the toolbar instead of falling
          // straight into the overflow drawer. The tab previously at that slot
          // gets pushed into overflow.
          const next =
            docs.length >= MAX_VISIBLE_TABS
              ? [
                  ...docs.slice(0, MAX_VISIBLE_TABS - 1),
                  newTab,
                  ...docs.slice(MAX_VISIBLE_TABS - 1),
                ]
              : [...docs, newTab];
          return {
            open_documents: next,
            active_document_tab: tab.id,
          };
        });
      },

      removeDocumentTab: (id) => {
        set((state) => {
          const remaining = state.open_documents.filter((d) => d.id !== id);
          const was_active = state.active_document_tab === id;
          const new_active = was_active
            ? remaining.length > 0
              ? remaining[remaining.length - 1].id
              : null
            : state.active_document_tab;
          return {
            open_documents: remaining,
            active_document_tab: new_active,
          };
        });
      },

      setActiveDocumentTab: (id) => set({ active_document_tab: id }),

      updateDocumentTab: (id, patch) => {
        set((state) => ({
          open_documents: state.open_documents.map((doc) =>
            doc.id === id ? { ...doc, ...patch } : doc
          ),
        }));
      },

      closeAllTabs: () =>
        set({ open_documents: [], active_document_tab: null }),

      promoteTabToVisible: (id, maxVisible) => {
        set((state) => {
          // No visible window (mobile, toolbar hidden) — nothing to promote
          if (maxVisible <= 0) return state;
          const docs = state.open_documents;
          const idx = docs.findIndex((d) => d.id === id);
          // Already visible (or not found) — nothing to swap
          if (idx < 0 || idx < maxVisible) return state;
          const targetIdx = maxVisible - 1;
          // Swap doc at `idx` with doc currently at `targetIdx`
          const next = docs.slice();
          [next[targetIdx], next[idx]] = [next[idx], next[targetIdx]];
          return { open_documents: next };
        });
      },

      setIsReceived: (received) => set({ is_received: received }),
    }),
    {
      name: 'pos-document-store',
      partialize: (state) => ({
        open_documents: state.open_documents,
        active_document_tab: state.active_document_tab,
        is_received: state.is_received,
      }),
      // Defensive scrub: earlier versions of `promoteTabToVisible` could
      // corrupt the array with undefined/null entries when called with
      // maxVisible <= 0. Drop any garbage on rehydrate so old persisted
      // state doesn't crash the renderer.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const clean = (state.open_documents ?? []).filter(
          (d): d is DocumentTab => !!d && typeof d.id === 'string'
        );
        if (clean.length !== state.open_documents.length) {
          state.open_documents = clean;
          if (
            state.active_document_tab &&
            !clean.some((d) => d.id === state.active_document_tab)
          ) {
            state.active_document_tab = null;
          }
        }
      },
    }
  )
);

/** Helper: create a new document tab ID */
export function newDocTabId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
