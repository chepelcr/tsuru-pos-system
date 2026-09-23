/**
 * App-wide home of the XML import (TSR-335).
 *
 * Mounted once in the dashboard layout, so the upload queue outlives the page
 * that started it: the user picks the files, closes the drawer and keeps
 * working. While anything is queued this shows a small floating pill with the
 * overall progress; clicking it reopens the drawer. Closing or reloading the
 * tab would drop the uploads still in flight, so the browser asks first.
 */

import { useEffect } from 'react';
import { Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDocumentImport, useDocumentImportStore } from '@/hooks/useDocumentImport';
import { ImportXmlDocumentsDrawer } from './ImportXmlDocumentsDrawer';

export function DocumentImportTray({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const drawerOpen = useDocumentImportStore((state) => state.drawer_open);
  const openDrawer = useDocumentImportStore((state) => state.openDrawer);
  const { percent, settled, started, busy, clearFinished } = useDocumentImport();

  useEffect(() => {
    if (!busy) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  // Only files the user already sent count: selected-but-not-uploaded ones wait in the drawer.
  const finished = started > 0 && settled === started;

  return (
    <>
      <ImportXmlDocumentsDrawer orgId={orgId} />
      {!drawerOpen && started > 0 && (
        <div className="fixed bottom-4 right-4 z-40 card shadow-lg flex items-center gap-3 px-4 py-3 w-[300px] max-w-[calc(100vw-32px)]">
          <button
            type="button"
            onClick={openDrawer}
            aria-label={t('documents.import.tray.open')}
            className="flex items-center gap-3 flex-1 min-w-0 bg-transparent border-0 p-0 text-left cursor-pointer"
          >
            <Icon name={finished ? 'check' : 'upload'} size={18} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="t-sm font-semibold truncate">
                {t(finished ? 'documents.import.tray.done' : 'documents.import.tray.active', {
                  done: settled,
                  total: started,
                })}
              </div>
              {!finished && (
                <div className="progress mt-1.5" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-bar" style={{ width: `${percent}%` }} />
                </div>
              )}
            </div>
          </button>
          {finished && (
            <button
              type="button"
              onClick={clearFinished}
              aria-label={t('common.close')}
              className="bg-transparent border-0 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
