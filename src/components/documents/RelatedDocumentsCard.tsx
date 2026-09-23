/**
 * The documents linked to this one by an InformacionReferencia (TSR-341).
 *
 * A credit note shows the document it references; an invoice shows the notes
 * that reference it and what they did to its amount — original total, credited,
 * and the FINAL amount (`adjusted_total`). The XML's own figures never change;
 * only validated notes move the final amount.
 */

import { Link } from 'wouter';
import { Badge, Card, Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ATV_STATUS } from '@/lib/documentStatus';
import { formatMoney } from '@/lib/money';
import { documentDetailPath } from '@/routePaths';
import { DOCUMENT_TYPES, type SaleDocument } from '@/types/invoice';
import type { DocumentCatalogLabels } from '@/hooks/useDocumentCatalogLabels';

export function RelatedDocumentsCard({ sale, labels }: { sale: SaleDocument; labels: DocumentCatalogLabels }) {
  const { t } = useLanguage();
  const related = sale.related_documents ?? [];
  const total = sale.summary?.voucher_total ?? 0;
  const finalAmount = sale.adjusted_total ?? total;
  const hasNotes = related.some((doc) => doc.relation === 'referenced_by');
  if (!related.length) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="layers" size={14} className="text-accent-rose" />
        <span className="label-section">{t('documents.related.title')}</span>
      </div>

      <ul className="list-none m-0 p-0">
        {related.map((doc) => {
          const type = DOCUMENT_TYPES.find((d) => d.code === doc.document_type);
          const status = doc.validation_status != null ? ATV_STATUS[doc.validation_status] : null;
          return (
            <li key={`${doc.relation}-${doc.sale_id}`} className="py-3 border-b border-border last:border-b-0">
              <Link href={documentDetailPath(doc.sale_id)} className="flex items-start justify-between gap-3 no-underline">
                <div className="min-w-0">
                  <div className="t-xs text-muted-foreground">
                    {t(doc.relation === 'references' ? 'documents.related.references' : 'documents.related.referencedBy')}
                  </div>
                  <div className="t-body font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    <span className={`t-xs font-bold px-1.5 py-0.5 rounded border border-current ${type?.color ?? 'text-muted-foreground'}`}>
                      {type?.short ?? doc.document_type}
                    </span>
                    <span className="font-mono">#{doc.consecutive_number ?? '—'}</span>
                  </div>
                  <div className="t-xs text-muted-foreground mt-0.5">
                    {labels.referenceCode(doc.reference_code)}
                    {doc.tipo_nota === 'NCprontopago' ? ` · ${t('documents.related.earlyPayment')}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="t-body font-semibold t-num">{formatMoney(doc.total_amount ?? 0)}</span>
                  {status && <Badge variant={status.variant}>{t(status.labelKey)}</Badge>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {hasNotes && (
        <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-3">
          <div>
            <div className="t-label">{t('documents.balance.original')}</div>
            <div className="t-body font-semibold t-num">{formatMoney(total)}</div>
          </div>
          <div>
            <div className="t-label">{t('documents.balance.credited')}</div>
            <div className="t-body font-semibold t-num text-success">-{formatMoney(sale.credited_total ?? 0)}</div>
          </div>
          <div>
            <div className="t-label">{t('documents.balance.final')}</div>
            <div className="t-stat t-num">{formatMoney(finalAmount)}</div>
          </div>
        </div>
      )}
    </Card>
  );
}
