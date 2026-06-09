import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentStore, newDocTabId } from '@/store/documentStore';
import { documentEditorPath } from '@/routePaths';
import { DOCUMENT_TYPES } from '@/types/invoice';
import type { DocTypeCode } from '@/types/invoice';
import { useLanguage } from '@/contexts/LanguageContext';

interface NewDocumentButtonProps {
  /** When true, the button stretches full-width with icon + label (mobile drawer).
      Otherwise renders a compact square icon-only button (navbar / sidebar). */
  fullWidth?: boolean;
  /** Dropdown open direction. 'up' anchors the panel above the button (footer placements). */
  direction?: 'up' | 'down';
  /** Optional callback fired after a doc is created (mobile drawer uses this to close itself). */
  onCreate?: () => void;
}

/**
 * Standalone create-document trigger + 6-doc-type dropdown.
 *
 * Visual variants:
 *  - `fullWidth=false` (default): compact 36px square `+` icon button — matches
 *    the main sidebar's inline `+` button style. Used in the global navbar.
 *  - `fullWidth=true`: full-width button with a left-anchored Plus icon and
 *    "Nuevo" label. Used in the mobile drawer footer.
 */
export function NewDocumentButton({
  fullWidth = false,
  direction = 'down',
  onCreate,
}: NewDocumentButtonProps) {
  const { addDocumentTab } = useDocumentStore();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click-outside via document-level listener. This is more robust
  // than a backdrop div because it isn't subject to stacking-context bugs
  // (e.g., when a parent ancestor creates its own stacking context with
  // `transform`, `filter`, `position: sticky` + z-index, etc).
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const createDoc = (docType: typeof DOCUMENT_TYPES[number]) => {
    setOpen(false);
    const tabId = newDocTabId();
    addDocumentTab({
      id: tabId,
      type: 'new',
      title: docType.label,
      doc_type: docType.code as DocTypeCode,
      data: { document_type: docType.code as DocTypeCode },
      is_dirty: false,
      opened_at: Date.now(),
    });
    setLocation(documentEditorPath(tabId));
    onCreate?.();
  };

  return (
    <div ref={containerRef} className={cn('relative', fullWidth ? 'w-full' : 'shrink-0')}>
      {fullWidth ? (
        // Mobile drawer footer: full-width button with icon on the left + "Nuevo" label.
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'w-full h-10 px-3 rounded-md text-[13px] font-semibold flex items-center justify-between gap-3 transition-colors',
            open
              ? 'bg-primary/10 text-primary border border-primary'
              : 'bg-primary text-primary-foreground border border-transparent shadow-sm shadow-primary/20'
          )}
        >
          <Plus size={16} className="shrink-0" />
          <span className="flex-1 text-left">{t('documents.newShort')}</span>
        </button>
      ) : (
        // Navbar: shows `+ Nuevo` on mobile and shrinks to an icon-only square on
        // sm+. Always visible — the create flow must be reachable on any size.
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t('documents.newDocument')}
          title={t('documents.newDocument')}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-0 sm:w-9 rounded-md transition-colors',
            open
              ? 'bg-primary/10 text-primary border border-primary'
              : 'bg-primary text-primary-foreground border border-transparent shadow-sm shadow-primary/20'
          )}
        >
          <Plus size={16} className="shrink-0" />
          <span className="text-[13px] font-semibold sm:hidden">
            {t('documents.newShort')}
          </span>
        </button>
      )}

      {open && (
        <div
          className={cn(
            'absolute z-dropdown w-60 rounded-lg border border-border bg-card shadow-lg py-1',
            direction === 'up' ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]',
            // Mobile: anchor LEFT so the panel drops left→right and isn't clipped
            // off the screen edge. sm+: keep the original right-anchored placement.
            fullWidth ? 'left-0 right-0 w-auto' : 'left-0 sm:left-auto sm:right-0'
          )}
        >
          {DOCUMENT_TYPES.map((dt) => (
            <button
              key={dt.code}
              onClick={() => createDoc(dt)}
              className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-muted flex items-center gap-3 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: dt.dotColor }}
              />
              <span className={cn('text-[11px] font-bold', dt.color)}>{dt.short}</span>
              <span>{t(`docTypes.${dt.code}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
