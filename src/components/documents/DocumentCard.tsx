import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/FadeIn';
import { DOCUMENT_TYPES } from '@/types/invoice';
import { usePermissions } from '@/hooks/useRbac';
import { useLanguage } from '@/contexts/LanguageContext';
import { documentDetailPath } from '@/routePaths';
import type { DocumentListItem } from '@/types/document';
import { formatMoney as fmt } from "@/lib/money";

/**
 * ATV codes: 0 = recién enviado (aún sin respuesta), 1 = aceptado,
 * 2 = en proceso, 3 = rechazado.
 *
 * 0 has to be listed: a freshly emitted document sits there until the
 * validator gets an answer, and it is the state a cashier sees most often
 * right after charging.
 */
const STATUS_LABELS: Record<number, { labelKey: string; className: string }> = {
  0: { labelKey: 'documents.action.processing', className: 'bg-info/10 text-info border-info/20' },
  1: { labelKey: 'documents.action.accepted', className: 'bg-success/10 text-success border-success/20' },
  2: { labelKey: 'documents.action.pending', className: 'bg-warning/10 text-warning border-warning/20' },
  3: { labelKey: 'documents.action.rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

interface DocumentCardProps {
  doc: DocumentListItem;
  isReceived: boolean;
  onAction: (doc: DocumentListItem, action: string) => void;
  delay?: number;
}

export function DocumentCard({ doc, isReceived, onAction, delay = 0 }: DocumentCardProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { can, isReady: permsReady } = usePermissions();
  // Download/resend re-distribute the document → documents/export/{sub};
  // receiver accept/reject mirrors ConfirmationsPage → commercial/update/confirmations.
  const canExport = !permsReady || can('documents', 'export', isReceived ? 'received' : 'emitted');
  const canConfirm = !permsReady || can('commercial', 'update', 'confirmations');
  const dt = DOCUMENT_TYPES.find((d) => d.code === doc.document_type);
  const status = doc.atv_validation?.validation_status;
  // `status` is 0 for a just-submitted document, so a truthiness test both
  // hid the badge and — via `{status && <ActionBtn/>}` below — printed a
  // literal "0" into the action row.
  const hasStatus = status !== undefined && status !== null;
  const statusInfo = hasStatus ? STATUS_LABELS[status] : null;
  const dateStr = new Date(doc.sale_date).toLocaleDateString('es-CR', {
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
        {statusInfo && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', statusInfo.className)}>
            {t(statusInfo.labelKey)}
          </span>
        )}
      </button>

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-muted-foreground">{t('common.total')}</span>
        <span className="font-mono font-bold t-num">{fmt(doc.summary?.voucher_total ?? 0)}</span>
      </div>

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
        {canExport && <ActionBtn label={t('documents.action.resend')} onClick={() => onAction(doc, 'resend')} />}
        {isReceived && canConfirm && (
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
