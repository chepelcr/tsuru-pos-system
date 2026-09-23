import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/FadeIn';
import { DOCUMENT_TYPES } from '@/types/invoice';
import { usePermissions } from '@/hooks/useRbac';
import { useLanguage } from '@/contexts/LanguageContext';
import { documentDetailPath } from '@/routePaths';
import type { DocumentListItem } from '@/types/document';
import { formatMoney as fmt } from "@/lib/money";
import { STATUS_PILL_CLASSES, documentStatusView, hasHaciendaActions } from '@/lib/documentStatus';

interface DocumentCardProps {
  doc: DocumentListItem;
  isReceived: boolean;
  onAction: (doc: DocumentListItem, action: string) => void;
  delay?: number;
}

export function DocumentCard({ doc, isReceived, onAction, delay = 0 }: DocumentCardProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  // Download/resend re-distribute the document → documents/export/{sub};
  // receiver accept/reject mirrors ConfirmationsPage → commercial/update/confirmations.
  const canExport = can('documents', 'export', isReceived ? 'received' : 'emitted');
  const canConfirm = can('commercial', 'update', 'confirmations');
  const dt = DOCUMENT_TYPES.find((d) => d.code === doc.document_type);
  // One status map for every document surface (lib/documentStatus). A
  // document Hacienda does not know in this environment shows that instead of
  // an ATV verdict, and offers nothing that talks to Hacienda.
  const statusInfo = documentStatusView(doc);
  const hacienda = hasHaciendaActions(doc);
  const hasStatus = !!statusInfo && hacienda;
  const total = doc.summary?.voucher_total ?? 0;
  const finalAmount = doc.adjusted_total ?? total;
  const dateStr = new Date(doc.sale_date ?? doc.created_on ?? '').toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const openDetail = () => navigate(documentDetailPath(doc.sale_id));

  return (
    <FadeIn delay={delay} duration={0.4}>
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
      {/* Header — opens the document detail. A button (not the whole card) so
          the action row below stays independently clickable and the target is
          reachable by keyboard. */}
      <button
        type="button"
        onClick={openDetail}
        className="w-full flex items-start justify-between gap-2 text-left bg-transparent border-0 p-0 cursor-pointer group"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', dt?.color ?? 'text-muted-foreground', 'border-current')}>
              {dt?.short ?? '?'}
            </span>
            {doc.consecutive_number ? (
              <span className="font-mono text-[13px] font-semibold group-hover:text-primary transition-colors">
                # {doc.consecutive_number}
              </span>
            ) : (
              <span className="text-[12px] text-muted-foreground italic">{t('documents.pipeline.pending')}</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{dateStr}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {statusInfo && (
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_PILL_CLASSES[statusInfo.variant])}>
              {t(statusInfo.labelKey)}
            </span>
          )}
          {doc.origin === 'IMPORT' && (
            <span className="badge-mini badge-mini-rose">{t('documents.origin.imported')}</span>
          )}
        </div>
      </button>

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-muted-foreground">{t('common.total')}</span>
        <span className="font-mono font-bold t-num">{fmt(total)}</span>
      </div>
      {finalAmount !== total && (
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-muted-foreground">{t('documents.balance.final')}</span>
          <span className="font-mono font-semibold t-num text-success">{fmt(finalAmount)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
        <ActionBtn label={t('common.view')} onClick={openDetail} />
        {/* Never gated on `doc.pdf_url`: the sale row does not carry the
            artifact urls (they come from `GET /sales/{id}/xml/files`), so that
            check disabled these buttons on every row, accepted or rejected
            alike. The viewer/downloader each render their own pending state
            when the file genuinely is not there yet. */}
        <ActionBtn label={t('documents.action.pdf')} onClick={() => onAction(doc, 'pdf')} />
        {canExport && (
          <ActionBtn label={t('documents.action.download')} onClick={() => onAction(doc, 'download')} />
        )}
        {hasStatus && <ActionBtn label={t('documents.action.validation')} onClick={() => onAction(doc, 'validation')} />}
        {canExport && hacienda && <ActionBtn label={t('documents.action.resend')} onClick={() => onAction(doc, 'resend')} />}
        {isReceived && canConfirm && hacienda && (
          <ActionBtn label={t('documents.action.accept')} onClick={() => onAction(doc, 'accept')} />
        )}
      </div>
    </div>
    </FadeIn>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-2.5 rounded border border-border text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
    >
      {label}
    </button>
  );
}
