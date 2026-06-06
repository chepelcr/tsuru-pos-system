import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useDocumentStore } from '@/store/documentStore';
import { useMaxVisibleTabs } from '@/store/uiStore';
import { ROUTES, documentEditorPath } from '@/routePaths';
import { getDocumentTypeInfo } from '@/types/invoice';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Compact toolbar embedded inside the global navbar — renders the
 * "Documentos" link followed by an inline square-tab strip for each
 * open document draft. Hidden when there are no open tabs.
 *
 * The tab visual is the recovered look from commit c83895c:
 *   - px-4 py-2.5 padding (square not round)
 *   - border-b-2 with the doc-type colour on the active tab
 *   - text + 5%-alpha background also in the doc-type colour on active
 *   - muted-foreground on inactive tabs
 *
 * Inline `style={{ color: info.dotColor }}` on the active tab lets
 * `border-current text-current bg-current/5` all resolve to the
 * doc-type hex without dynamic Tailwind class composition.
 */
export function DocumentsToolbar() {
  const { open_documents, removeDocumentTab, promoteTabToVisible } = useDocumentStore();
  const maxVisible = useMaxVisibleTabs();
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();

  const editorMatch = location.match(/^\/dashboard\/documents\/new\/([^/?#]+)/);
  const activeTabId = editorMatch?.[1] ?? null;
  const onDocsRoute = location.startsWith(ROUTES.DASHBOARD_DOCUMENTS);

  // If the visible window shrinks (sidebar expands → maxVisible drops from 3→2)
  // and the active tab now sits in overflow, promote it into the last visible
  // slot so the user doesn't lose sight of the doc they're currently editing.
  useEffect(() => {
    if (!activeTabId || maxVisible <= 0) return;
    const idx = open_documents.findIndex((d) => d.id === activeTabId);
    if (idx >= maxVisible) promoteTabToVisible(activeTabId, maxVisible);
  }, [activeTabId, maxVisible, open_documents, promoteTabToVisible]);

  const handleTabClick = (id: string) => {
    if (id !== activeTabId) setLocation(documentEditorPath(id));
  };

  const handleTabClose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDocumentTab(id);
    if (activeTabId === id) {
      // Route reconcile: switch to the next remaining tab, or back to the list
      const remaining = open_documents.filter((d) => d.id !== id);
      if (remaining.length === 0) {
        setLocation(ROUTES.DASHBOARD_DOCUMENTS);
      } else {
        setLocation(documentEditorPath(remaining[remaining.length - 1].id));
      }
    }
  };

  // "Documentos" is active when on the list route — i.e. /dashboard/documents
  // without an editor sub-path
  const docsTabActive = onDocsRoute && !activeTabId;

  // Only render the first `maxVisible` tabs inline. The count is dynamic:
  // 2 when the left sidebar is expanded, 3 when collapsed — driven by
  // `useMaxVisibleTabs`. Tabs beyond that index are reachable via the
  // right-side drawer (see DashboardHeader for the overflow toggle button
  // + DocumentsMobileDrawer for the swap-on-click logic).
  const visibleTabs = open_documents.slice(0, maxVisible);

  return (
    <div className="flex items-stretch min-w-0">
      {/* Documentos — first tab in the strip, always visible.
          Same square shape as document tabs; active when on the list route. */}
      <div
        onClick={() => setLocation(ROUTES.DASHBOARD_DOCUMENTS)}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 cursor-pointer select-none shrink-0',
          'border-b-2 transition-colors',
          docsTabActive
            ? 'border-current text-current bg-current/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        style={docsTabActive ? { color: 'hsl(var(--primary))' } : undefined}
        title={t('documents.goToList')}
      >
        <span className="text-[14px]" aria-hidden>📄</span>
        <span className="text-[12px] font-display font-bold">{t('documents.title')}</span>
      </div>

      {/* Open document tab chips — same square style. Capped at
          MAX_VISIBLE_TABS; overflow lives in the right-side drawer. */}
      {visibleTabs.map((tab) => {
        const info = getDocumentTypeInfo(tab.doc_type);
        const isActive = activeTabId === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 cursor-pointer select-none shrink-0',
              'border-b-2 transition-colors',
              isActive
                ? 'border-current bg-current/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            style={isActive ? { color: info?.dotColor } : undefined}
          >
            {!isActive && info && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: info.dotColor }}
              />
            )}
            <span className="text-[10px] font-display font-bold uppercase tracking-wider opacity-70">
              {info?.short ?? '?'}
            </span>
            <span className="text-[12px] font-semibold truncate max-w-[120px]">
              {t(`docTypes.${tab.doc_type}`)}
            </span>
            {tab.is_dirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"
                title={t('documents.unsavedChanges')}
              />
            )}
            <button
              onClick={(e) => handleTabClose(tab.id, e)}
              className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-[10px] leading-none"
              title={t('documents.closeTab')}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
