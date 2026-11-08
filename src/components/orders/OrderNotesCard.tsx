import { Link } from 'wouter';
import { Badge, Card, Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ATV_STATUS } from '@/lib/documentStatus';
import { fmt } from '@/lib/utils';
import { documentDetailPath } from '@/routePaths';
import type { Order } from '@/types/order';

interface OrderNotesCardProps {
  order: Pick<Order, 'credit_notes' | 'debit_notes' | 'final_total'>;
  /** The billing document's own final amount, for orders recorded before `final_total`. */
  invoiceAdjustedTotal?: number | null;
}

/**
 * Credit and debit notes issued against the order's invoice, and what the sale
 * finally came to (grand total − credit notes + debit notes). Hidden when the
 * order has no notes.
 */
export function OrderNotesCard({ order, invoiceAdjustedTotal }: OrderNotesCardProps) {
  const { t } = useLanguage();
  const notes = [
    ...(order.credit_notes ?? []).map((note) => ({ note, sign: -1 })),
    ...(order.debit_notes ?? []).map((note) => ({ note, sign: 1 })),
  ];
  if (notes.length === 0) return null;
  const finalTotal = order.final_total ?? invoiceAdjustedTotal ?? null;

  return (
    <Card className="p-6 mb-3.5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="layers" size={14} className="text-accent-rose" />
        <span className="label-section">{t('orders.notes.title')}</span>
      </div>
      {notes.map(({ note, sign }) => {
        const status = note.status != null ? ATV_STATUS[note.status] : null;
        return (
          <Link
            key={note.document_id}
            href={note.document_id ? documentDetailPath(note.document_id) : '#'}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-b-0 no-underline"
          >
            <div className="min-w-0">
              <div className="t-body font-semibold text-foreground font-mono">#{note.consecutive_number ?? '—'}</div>
              <div className="t-xs text-muted-foreground">
                {note.tipo_nota === 'NCprontopago'
                  ? t('documents.related.earlyPayment')
                  : t(`docTypes.${note.document_type ?? (sign < 0 ? '03' : '02')}`)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="t-body font-semibold t-num">{sign < 0 ? '-' : '+'}{fmt(note.total_amount ?? 0)}</span>
              {status && <Badge variant={status.variant}>{t(status.labelKey)}</Badge>}
            </div>
          </Link>
        );
      })}
      {finalTotal != null && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
          <span className="t-sm text-muted-foreground">{t('documents.balance.final')}</span>
          <span className="t-stat t-num" data-testid="order-final-total">{fmt(finalTotal)}</span>
        </div>
      )}
    </Card>
  );
}
