import { useEffect, useRef, useState } from 'react';
import { Badge, Drawer, Button, Icon, Spinner } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrderImport, useOrderImportStore, isOrderImportBusy, type OrderImportPhase, type RejectedOrderFile } from '@/hooks/useOrderImport';

const PHASES = {
  selected: { label: 'orders.excel.phase.selected', variant: 'secondary' },
  waiting: { label: 'orders.excel.phase.waiting', variant: 'secondary' },
  processing: { label: 'common.processing', variant: 'info' },
  imported: { label: 'orders.excel.uploadSuccess', variant: 'success' },
  failed: { label: 'orders.excel.uploadFailed', variant: 'destructive' },
} as const;

interface OrderExcelUploadProps { orgId: string }

/** Select many spreadsheets, then start the batch; each file keeps its own result. */
export function OrderExcelUpload({ orgId }: OrderExcelUploadProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<RejectedOrderFile[]>([]);
  const open = useOrderImportStore(state => state.drawerOpen);
  const { closeDrawer, addFiles, startSelected, retry, remove, clearFinished } = useOrderImportStore.getState();
  const { rows, started, finished, selected, percent, busy } = useOrderImport(orgId);

  useEffect(() => { setRejected([]); }, [orgId]);

  const accept = (files: FileList | null) => {
    setRejected(addFiles(orgId, Array.from(files ?? [])));
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Drawer open={open} onClose={closeDrawer} closeLabel={t('common.close')}
      title={t('orders.excel.title')} subtitle={t('orders.excel.subtitle')} icon="upload" width={560}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => clearFinished(orgId)} disabled={!finished}>
            {t('orders.excel.clearFinished')}
          </Button>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant={selected ? 'outline' : 'primary'} size="sm" onClick={closeDrawer}>
              {busy ? t('orders.excel.keepInBackground') : t('common.close')}
            </Button>
            {!!selected && <Button variant="primary" size="sm" icon="upload" onClick={() => startSelected(orgId)}>
              {t('orders.excel.importSelected', { n: selected })}
            </Button>}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <p className="t-sm text-muted-foreground">{t('orders.excel.description')}</p>
        <button type="button" onClick={() => inputRef.current?.click()}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); }}
          className={`w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/35 hover:border-primary/40'}`}
        >
          <Icon name="upload" size={24} className="mx-auto mb-2 text-primary" />
          <span className="block t-body font-semibold">{t('orders.excel.chooseFiles')}</span>
          <span className="block t-xs text-muted-foreground mt-1">{t('orders.excel.fileHint')}</span>
        </button>
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls" className="hidden"
          aria-label={t('orders.excel.chooseFiles')} onChange={event => accept(event.target.files)} />

        {!!rejected.length && <ul role="alert" className="list-none p-0 m-0 space-y-1">
          {rejected.map((item, index) => <li key={index} className="t-xs text-destructive break-words [overflow-wrap:anywhere]">
            {item.name} — {t(`orders.excel.error.${item.reason}`)}
          </li>)}
        </ul>}

        {!!started && <div className="card p-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="t-sm">{t('orders.excel.counts', { done: finished, total: started })}</span>
            <span className="t-sm font-semibold t-num">{percent}%</span>
          </div>
          <div className="progress" role="progressbar" aria-label={t('orders.excel.title')}
            aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          </div>
        </div>}

        {!!rows.length && <ul className="list-none m-0 p-0" aria-label={t('orders.excel.files')}>
          {rows.map(row => {
            const phase = PHASES[row.phase as OrderImportPhase];
            return <li key={row.key} className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
              <div className="icon-pill w-9 h-9 shrink-0">
                {row.phase === 'processing' ? <Spinner size={16} /> : <Icon name="fileText" size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="t-sm font-semibold break-words [overflow-wrap:anywhere]">{row.file.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="t-xs text-muted-foreground">{(row.file.size / 1024).toFixed(0)} KB</span>
                  <Badge variant={phase.variant}>{t(phase.label)}</Badge>
                </div>
                {row.phase === 'failed' && row.error && <p className="t-xs text-destructive mt-2 break-words [overflow-wrap:anywhere]">{row.error}</p>}
              </div>
              <div className="flex shrink-0">
                {row.phase === 'failed' && <button type="button" className="btn btn-ghost btn-icon min-h-11 min-w-11"
                  onClick={() => retry(row.key)} aria-label={t('orders.excel.retryFile', { name: row.file.name })}>
                  <Icon name="refresh" size={16} />
                </button>}
                {!isOrderImportBusy(row) && <button type="button" className="btn btn-ghost btn-icon min-h-11 min-w-11"
                  onClick={() => remove(row.key)} aria-label={t('orders.excel.removeFile', { name: row.file.name })}>
                  <Icon name="close" size={16} />
                </button>}
              </div>
            </li>;
          })}
        </ul>}
      </div>
    </Drawer>
  );
}
