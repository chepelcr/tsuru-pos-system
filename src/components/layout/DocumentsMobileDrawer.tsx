import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useDocumentStore } from "@/store/documentStore";
import { useMaxVisibleTabs } from "@/store/uiStore";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { ROUTES, documentEditorPath } from "@/routePaths";
import { getDocumentTypeInfo } from "@/types/invoice";
import { Icon } from "@/components/ui";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { useLanguage } from "@/contexts/LanguageContext";

interface DocumentsMobileDrawerProps {
  open: boolean;
  isClosing: boolean;
  shouldRender: boolean;
  onClose: () => void;
}

/**
 * Right-side drawer that lists open document drafts.
 *
 * - Mobile (<769px): renders the full nav surface — Documentos link, ALL open
 *   drafts (none of them are in the navbar at this size), and the "+ Nuevo"
 *   button at the footer.
 * - Tablet/Desktop (≥769px): renders ONLY overflow drafts (those at index
 *   `≥ maxVisible`) — the ones already in the navbar's DocumentsToolbar are
 *   omitted to avoid duplication. Selecting an overflow draft swaps it into
 *   the visible window via `promoteTabToVisible`.
 *
 * Uses `isolation: isolate` on the outer wrapper to guarantee its stacking
 * context sits cleanly above the rest of the page, regardless of any
 * `position: sticky` / `transform` ancestors in the layout below.
 */
export function DocumentsMobileDrawer({
  open,
  isClosing,
  shouldRender,
  onClose,
}: DocumentsMobileDrawerProps) {
  const { open_documents, removeDocumentTab, promoteTabToVisible } = useDocumentStore();
  const [location, setLocation] = useLocation();
  const isDesktop = useIsDesktop(769);
  const maxVisible = useMaxVisibleTabs();
  const { t } = useLanguage();

  const editorMatch = location.match(/^\/dashboard\/documents\/new\/([^/?#]+)/);
  const activeTabId = editorMatch?.[1] ?? null;

  // On tablet/desktop the drawer is only a way to reach OVERFLOW tabs (the
  // ones that didn't fit in the navbar). On mobile it lists everything.
  const visibleDrafts = useMemo(
    () => (isDesktop ? open_documents.slice(maxVisible) : open_documents),
    [isDesktop, maxVisible, open_documents]
  );

  useEffect(() => {
    if (open && shouldRender) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, shouldRender]);

  if (!shouldRender) return null;

  const handleTabClick = (id: string) => {
    if (isDesktop) {
      const idx = open_documents.findIndex((d) => d.id === id);
      if (idx >= maxVisible) {
        promoteTabToVisible(id, maxVisible);
      }
    }
    setLocation(documentEditorPath(id));
    onClose();
  };

  const handleTabClose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDocumentTab(id);
    if (activeTabId === id) {
      const remaining = open_documents.filter((d) => d.id !== id);
      if (remaining.length === 0) {
        setLocation(ROUTES.DASHBOARD_DOCUMENTS);
        onClose();
      } else {
        setLocation(documentEditorPath(remaining[remaining.length - 1].id));
      }
    }
  };

  const goToDocsList = () => {
    setLocation(ROUTES.DASHBOARD_DOCUMENTS);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-tooltip flex justify-end"
      style={{ isolation: "isolate" }}
    >
      <div
        className={`absolute inset-0 overlay-backdrop-dim ${
          isClosing ? "drawer-overlay-exit" : "drawer-overlay-enter"
        }`}
        onClick={onClose}
      />

      <aside
        className={`relative w-[280px] h-[100dvh] bg-card shadow-modal flex flex-col overflow-hidden ${
          isClosing ? "drawer-panel-right-exit" : "drawer-panel-right-enter"
        }`}
      >
        {/* Top row — Documentos nav link + close button (always rendered) */}
        <div className="px-3 pt-3 pb-2 flex items-center gap-2 shrink-0">
          <button
            onClick={goToDocsList}
            className="btn btn-outline btn-sm flex-1 min-w-0 justify-start gap-2"
          >
            <Icon name="fileText" size={16} />
            <span className="font-display font-bold">{t('documents.title')}</span>
          </button>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="btn btn-outline btn-icon btn-sm flex-shrink-0"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Open drafts list */}
        {visibleDrafts.length > 0 ? (
          <>
            <div className="label-section px-4 pt-3 pb-1 shrink-0">
              {isDesktop ? t('documents.drawer.untabbedHeader') : t('documents.drawer.openHeader')}
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-1 pb-3 flex flex-col gap-1">
              {visibleDrafts.map((tab) => {
                const info = getDocumentTypeInfo(tab.doc_type);
                const isActive = activeTabId === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border ${
                      isActive
                        ? "bg-muted border-primary"
                        : "bg-transparent border-transparent hover:bg-muted"
                    }`}
                  >
                    <span
                      className="w-1 h-7 rounded-sm flex-shrink-0"
                      style={{ background: info?.dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="t-label !text-[10px] !tracking-[0.06em]">
                        {info?.short ?? "?"}
                        {tab.is_dirty && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-warning ml-1.5 align-middle"
                            title={t('documents.unsavedChanges')}
                          />
                        )}
                      </div>
                      <div className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-foreground">
                        {t(`docTypes.${tab.doc_type}`)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleTabClose(tab.id, e)}
                      className="btn-icon-ghost-sm flex-shrink-0"
                      title={t('documents.closeTab')}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-5 text-center text-muted-foreground text-xs">
            {isDesktop
              ? t('documents.drawer.emptyDesktop')
              : t('documents.drawer.emptyMobile')}
          </div>
        )}

        {/* Footer — "+ Nuevo" with dropdown opening UP */}
        <div className="px-3 pt-2 pb-3.5 border-t border-border shrink-0">
          <NewDocumentButton fullWidth direction="up" onCreate={onClose} />
        </div>
      </aside>
    </div>
  );
}
