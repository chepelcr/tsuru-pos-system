/**
 * Import signed Hacienda XML documents (v4.3 / v4.4) — TSR-335.
 *
 * One or many files. Each row shows its own progress bar and phase; the header
 * shows the overall percentage. The upload is the browser's last call: S3
 * notifies the import worker, which files the document in the SAME documents
 * list as the ones the platform issued, renders its PDF and asks Hacienda for
 * its status. The outcome of each file arrives as a bell notification and
 * settles its row here — including the files that are not the organization's,
 * which are listed at the end so the user sees every one that was refused.
 *
 * Mounted once in the dashboard layout (by `DocumentImportTray`), not by a page:
 * closing it or navigating away leaves the uploads running.
 */

import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { Badge, Button, Drawer, Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { documentDetailPath } from '@/routePaths';
import {
  FINAL_PHASES,
  type ImportPhase,
  type ImportRow,
  useDocumentImport,
  useDocumentImportStore,
} from '@/hooks/useDocumentImport';
import type { StatusVariant } from '@/lib/documentStatus';

const PHASE_VARIANT: Record<ImportPhase, StatusVariant> = {
  selected: 'secondary',
  waiting: 'secondary',
  uploading: 'info',
  processing: 'info',
  accepted: 'success',
  partial: 'warning',
  rejected: 'destructive',
  imported: 'success',
  foreign: 'secondary',
  duplicate: 'secondary',
  failed: 'destructive',
};

const PHASE_ICON: Record<ImportPhase, string> = {
  selected: 'fileText',
  waiting: 'clock',
  uploading: 'upload',
  processing: 'refresh',
  accepted: 'checkCircle',
  partial: 'checkCircle',
  rejected: 'xCircle',
  imported: 'checkCircle',
  foreign: 'alert',
  duplicate: 'copy',
  failed: 'alertCircle',
};

const REFUSED: ReadonlySet<ImportPhase> = new Set(['failed', 'duplicate']);

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isXml(file: File): boolean {
  return file.name.toLowerCase().endsWith('.xml');
}

function ImportRowItem({ row, onRemove, onRetry }: { row: ImportRow; onRemove: () => void; onRetry: () => void }) {
  const { t } = useLanguage();
  const percent = row.size ? Math.round((Math.min(row.loaded, row.size) / row.size) * 100) : 100;
  const final = FINAL_PHASES.has(row.phase);
  const errorText = row.errorCode
    ? t(`documents.import.error.${row.errorCode}`)
    : row.errorMessage;
  return (
    <li className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="icon-pill-rose-soft w-[34px] h-[34px] flex-shrink-0">
          <Icon name="fileText" size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="t-body font-semibold truncate" title={row.fileName}>{row.fileName}</div>
          <div className="t-xs text-muted-foreground">{formatBytes(row.size)}</div>
        </div>
        <Badge variant={PHASE_VARIANT[row.phase]} className="inline-flex items-center gap-1 flex-shrink-0">
          <Icon name={PHASE_ICON[row.phase]} size={11} />
          {t(`documents.import.phase.${row.phase}`)}
        </Badge>
        {row.phase === 'failed' && row.errorCode === 'IMPORT_UPLOAD_FAILED' && (
          <button type="button" className="btn-icon-ghost-sm" onClick={onRetry} aria-label={t('common.retry')}>
            <Icon name="refresh" size={14} />
          </button>
        )}
        {(row.phase === 'selected' || row.phase === 'waiting' || final) && (
          <button type="button" className="btn-icon-ghost-sm" onClick={onRemove} aria-label={t('common.remove')}>
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      {!final && row.phase !== 'selected' && (
        <div className="progress progress-thin mt-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${percent}%` }} />
        </div>
      )}
      {errorText && row.phase === 'failed' && <p className="t-xs text-destructive mt-1.5">{errorText}</p>}
      {row.saleId && (row.phase !== 'failed') && (
        <Link href={documentDetailPath(row.saleId)} className="t-xs text-primary underline mt-1.5 inline-block">
          {t('documents.import.openDocument')}
        </Link>
      )}
    </li>
  );
}

export function ImportXmlDocumentsDrawer({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const open = useDocumentImportStore((state) => state.drawer_open);
  const onClose = useDocumentImportStore((state) => state.closeDrawer);
  const { rows, percent, busy, settled, uploaded, started, selected, addFiles, startSelected, remove, retry, clearFinished } =
    useDocumentImport();

  const accept = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    const xml = files.filter(isXml);
    setRejected(files.filter((file) => !isXml(file)).map((file) => file.name));
    if (xml.length) addFiles(orgId, xml);
    if (inputRef.current) inputRef.current.value = '';
  };

  const refused = rows.filter((row) => REFUSED.has(row.phase));
  const done = settled;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      closeLabel={t('common.close')}
      title={t('documents.import.title')}
      subtitle={t('documents.import.subtitle')}
      icon="upload"
      width={560}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-between items-center">
          <Button variant="ghost" size="sm" onClick={clearFinished} disabled={!done}>
            {t('documents.import.clearFinished')}
          </Button>
          <div className="flex gap-2.5">
            <Button variant={selected ? 'ghost' : 'primary'} size="sm" onClick={onClose}>
              {busy ? t('documents.import.keepInBackground') : t('common.close')}
            </Button>
            {!!selected && (
              <Button variant="primary" size="sm" icon="upload" onClick={startSelected}>
                {t('documents.import.upload', { n: selected })}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files); }}
          className={`w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer bg-transparent ${
            dragging ? 'border-primary bg-primary/[0.06]' : 'border-border hover:border-primary/40'
          }`}
        >
          <Icon name="upload" size={22} className="text-primary mx-auto mb-2" />
          <div className="t-body font-semibold">{t('documents.import.drop')}</div>
          <div className="t-xs text-muted-foreground mt-1">{t('documents.import.dropHint')}</div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xml,application/xml,text/xml"
          multiple
          className="hidden"
          onChange={(e) => accept(e.target.files)}
        />

        {!!rejected.length && (
          <p className="t-xs text-destructive">{t('documents.import.notXml', { files: rejected.join(', ') })}</p>
        )}

        {!!started && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="label-section">{t('documents.import.overall')}</span>
              <span className="t-body font-semibold t-num">{percent}%</span>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
            <div className="t-xs text-muted-foreground mt-2">
              {t('documents.import.counts', { uploaded, done, total: started })}
            </div>
          </div>
        )}

        {!!rows.length && (
          <ul className="list-none m-0 p-0">
            {rows.map((row) => (
              <ImportRowItem key={row.key} row={row} onRemove={() => remove(row.key)} onRetry={() => retry(row.key)} />
            ))}
          </ul>
        )}

        {!!refused.length && (
          <div className="card-surface-muted rounded-lg p-4">
            <div className="label-section mb-2">{t('documents.import.notImported')}</div>
            <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
              {refused.map((row) => (
                <li key={row.key} className="t-sm">
                  <span className="font-semibold">{row.fileName}</span>
                  <span className="text-muted-foreground"> — {row.phase === 'duplicate'
                    ? t('documents.import.phase.duplicate')
                    : t(`documents.import.error.${row.errorCode ?? 'IMPORT_UPLOAD_FAILED'}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Drawer>
  );
}
