import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useDocumentStore } from '@/store/documentStore';
import { useMaxVisibleTabs, useUIStore } from '@/store/uiStore';
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
 * Centralized `text-doc-*` classes make `border-current` and `bg-current/5`
 * inherit each document type's semantic accent.
 */
export function DocumentsToolbar() {
  const { open_documents, removeDocumentTab, promoteTabToVisible } = useDocumentStore();
  const maxVisible = useMaxVisibleTabs();
  const setFittingTabs = useUIStore((s) => s.setFittingTabs);
  const stripRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();

  /**
   * How many tabs actually fit, measured rather than assumed.
   *
   * The old count was a fixed 2 or 3 from the breakpoint, which assumes every
   * tab is the same width. They are not — the label is a translated
   * document-type name, so "FE · Factura electrónica" and "TE · Tiquete" differ
   * by a lot. That is how the last tab ended up underneath the navbar's
   * right-hand controls.
   *
   * **Every tab stays in the DOM.** Overflowing ones are clipped by the
   * container's `overflow-hidden`, not unmounted — if measuring removed them,
   * their widths would drop out of the next measurement, which would then fit
   * one more, which would remove it again. Keeping the layout fixed is what
   * makes this stable rather than oscillating.
   */
  const measure = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const available = strip.clientWidth;
    const children = Array.from(strip.children) as HTMLElement[];
    // The first child is the "Documentos" link, which is always shown.
    const [docsLink, ...tabs] = children;
    let used = docsLink?.offsetWidth ?? 0;

    let fits = 0;
    for (const tab of tabs) {
      used += tab.offsetWidth;
      // Strictly greater: a tab whose right edge lands exactly on the boundary
      // is still fully visible.
      if (used > available) break;
      fits += 1;
    }
    setFittingTabs(fits);
  }, [setFittingTabs]);

  // Layout effect so the measurement happens before paint — the clipped frame is
  // never shown.
  useLayoutEffect(() => {
    measure();
    const strip = stripRef.current;
    if (!strip || typeof ResizeObserver === 'undefined') return;

    // The strip itself changes width when the sidebar collapses; its parent
    // changes when the viewport does. Observing both covers every case without
    // a window listener.
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    if (strip.parentElement) observer.observe(strip.parentElement);
    return () => observer.disconnect();
  }, [measure, open_documents.length]);

  // Tab labels are translated, so switching language changes their widths.
  useEffect(() => { measure(); }, [measure, t]);

  // Leaving the toolbar mounted with a stale count would make the drawer badge
  // lie on mobile, where the toolbar is not rendered at all.
  useEffect(() => () => setFittingTabs(null), [setFittingTabs]);

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

  // Every open tab is rendered; the ones past `maxVisible` are clipped by the
  // container and marked inert, so they cannot be clicked or reached by
  // keyboard. They are reachable through the right-side drawer instead (see
  // DashboardHeader's overflow toggle + DocumentsMobileDrawer).
  //
  // Rendering them rather than slicing them off is what keeps the measurement
  // above stable — see `measure`.
  return (
    <div ref={stripRef} className="flex items-stretch min-w-0 overflow-hidden">
      {/* Documentos — first tab in the strip, always visible.
          Same square shape as document tabs; active when on the list route. */}
      <div
        onClick={() => setLocation(ROUTES.DASHBOARD_DOCUMENTS)}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 cursor-pointer select-none shrink-0',
          'border-b-2 transition-colors',
          docsTabActive
            ? 'border-primary text-primary bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        title={t('documents.goToList')}
      >
        <span className="text-[14px]" aria-hidden>📄</span>
        <span className="text-[12px] font-display font-bold">{t('documents.title')}</span>
      </div>

      {/* Open document tab chips — same square style. The container clips past
          what fits, which is what stops the last tab from sliding under the
          navbar's right-hand controls; the clipped ones live in the drawer. */}
      {open_documents.map((tab, index) => {
        const info = getDocumentTypeInfo(tab.doc_type);
        const isActive = activeTabId === tab.id;
        // Past what fits: clipped by the container, and made inert so a hidden
        // tab is not focusable or clickable.
        const clipped = index >= maxVisible;
        return (
          <div
            key={tab.id}
            onClick={clipped ? undefined : () => handleTabClick(tab.id)}
            aria-hidden={clipped || undefined}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 select-none shrink-0',
              'border-b-2 transition-colors',
              clipped ? 'pointer-events-none' : 'cursor-pointer',
              isActive && info?.color,
              isActive
                ? 'border-current bg-current/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {!isActive && info && (
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 bg-current', info.color)} />
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
              tabIndex={clipped ? -1 : undefined}
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
