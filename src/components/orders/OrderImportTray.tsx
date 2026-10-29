import { useEffect } from 'react';
import { Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrderImport, useOrderImportStore, isOrderImportBusy } from '@/hooks/useOrderImport';
import { useDocumentImportStore } from '@/hooks/useDocumentImport';
import { OrderExcelUpload } from './OrderExcelUpload';

export function OrderImportTray({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const open = useOrderImportStore(state => state.drawerOpen);
  const anyBusy = useOrderImportStore(state => state.rows.some(isOrderImportBusy));
  const { openDrawer, clearFinished } = useOrderImportStore.getState();
  const { started, finished, percent } = useOrderImport(orgId);
  // Stack above the XML tray if both batches are active.
  const xmlTrayVisible = useDocumentImportStore(state => !state.drawer_open && state.rows.some(row => row.phase !== 'selected'));

  useEffect(() => {
    if (!anyBusy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyBusy]);

  return <>
    <OrderExcelUpload orgId={orgId} />
    {!open && started > 0 && <div className={`fixed right-4 z-40 card shadow-lg flex items-center gap-3 px-4 py-3 w-[300px] max-w-[calc(100vw-32px)] no-print ${xmlTrayVisible ? 'bottom-24' : 'bottom-4'}`}>
      <button type="button" onClick={openDrawer} className="flex items-center gap-3 flex-1 min-w-0 text-left"
        aria-label={t('orders.excel.openQueue')}>
        <Icon name={finished === started ? 'checkCircle' : 'upload'} size={18} className="shrink-0 text-primary" />
        <span className="flex-1 min-w-0">
          <span className="block t-sm font-semibold">{t('orders.excel.title')}</span>
          <span className="block t-xs text-muted-foreground">{t('orders.excel.counts', { done: finished, total: started })}</span>
          {finished !== started && <span className="progress block mt-1.5" role="progressbar" aria-label={t('orders.excel.title')}
            aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span className="progress-bar block" style={{ width: `${percent}%` }} />
          </span>}
        </span>
      </button>
      {finished === started && <button type="button" onClick={() => clearFinished(orgId)} className="btn btn-ghost btn-icon shrink-0"
        aria-label={t('common.close')}><Icon name="close" size={16} /></button>}
    </div>}
  </>;
}
