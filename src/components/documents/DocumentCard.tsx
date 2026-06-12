import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/FadeIn';
import { DOCUMENT_TYPES } from '@/types/invoice';
import { usePermissions } from '@/hooks/useRbac';
import type { DocumentListItem } from '@/types/document';

const fmt = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR');

const STATUS_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: 'Aceptado',  className: 'bg-success/10 text-success border-success/20' },
  2: { label: 'Pendiente', className: 'bg-warning/10 text-warning border-warning/20' },
  3: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

interface DocumentCardProps {
  doc: DocumentListItem;
  isReceived: boolean;
  onAction: (doc: DocumentListItem, action: string) => void;
  delay?: number;
}

export function DocumentCard({ doc, isReceived, onAction, delay = 0 }: DocumentCardProps) {
  const { can, isReady: permsReady } = usePermissions();
  // Download/resend re-distribute the document → documents/export/{sub};
  // receiver accept/reject mirrors ConfirmationsPage → commercial/update/confirmations.
  const canExport = !permsReady || can('documents', 'export', isReceived ? 'received' : 'emitted');
  const canConfirm = !permsReady || can('commercial', 'update', 'confirmations');
  const dt = DOCUMENT_TYPES.find((d) => d.code === doc.document_type);
  const status = doc.atv_validation?.validation_status;
  const statusInfo = status ? STATUS_LABELS[status] : null;
  const dateStr = new Date(doc.sale_date).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <FadeIn delay={delay} duration={0.4}>
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', dt?.color ?? 'text-muted-foreground', 'border-current')}>
              {dt?.short ?? '?'}
            </span>
            {doc.consecutive_number ? (
              <span className="font-mono text-[13px] font-semibold"># {doc.consecutive_number}</span>
            ) : (
              <span className="text-[12px] text-muted-foreground italic">Pendiente</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{dateStr}</div>
        </div>
        {statusInfo && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', statusInfo.className)}>
            {statusInfo.label}
          </span>
        )}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-muted-foreground">Total</span>
        <span className="font-mono font-bold t-num">{fmt(doc.summary?.voucher_total ?? 0)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
        <ActionBtn label="Ver PDF" onClick={() => onAction(doc, 'pdf')} disabled={!doc.pdf_url} />
        {canExport && <ActionBtn label="Descargar" onClick={() => onAction(doc, 'download')} disabled={!doc.pdf_url} />}
        {status && <ActionBtn label="Validación" onClick={() => onAction(doc, 'validation')} />}
        {canExport && <ActionBtn label="Reenviar" onClick={() => onAction(doc, 'resend')} />}
        {isReceived && canConfirm && <ActionBtn label="Aceptar/Rechazar" onClick={() => onAction(doc, 'accept')} />}
      </div>
    </div>
    </FadeIn>
  );
}

function ActionBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Pendiente de Hacienda' : undefined}
      className="h-7 px-2.5 rounded border border-border text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  );
}
