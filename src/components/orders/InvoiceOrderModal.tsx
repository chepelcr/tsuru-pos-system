import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useDocumentStore } from '@/store/documentStore';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatableDocTypes } from '@/hooks/useRbac';
import { readCachedProductsByIds } from '@/services/offlineCatalog';
import { buildInvoiceTabFromOrder, orderProductIds } from '@/lib/orderToInvoice';
import { documentEditorPath } from '@/routePaths';
import { DOCUMENT_TYPES } from '@/types/invoice';
import type { DocTypeCode } from '@/types/invoice';
import type { Order } from '@/types/order';
import { Drawer, Button, Icon, Spinner } from '@/components/ui';

/** Document types it makes sense to bill a delivered order with. */
const BILLABLE_DOC_TYPES: readonly DocTypeCode[] = ['01', '04'];

interface InvoiceOrderModalProps {
  open: boolean;
  order: Order;
  onClose: () => void;
}

/**
 * "Facturar pedido" — turn a delivered order into an electronic document.
 *
 * Picks the document type, rebuilds the cart from the order's lines, and hands
 * the user to the normal checkout. It deliberately does NOT emit anything
 * itself: the invoice still goes through the same receiver/tax/payment review
 * as any other sale, because that is where the fiscal decisions live.
 */
export function InvoiceOrderModal({ open, order, onClose }: InvoiceOrderModalProps) {
  const { t } = useLanguage();
  const { orgId } = useOrgContext();
  const [, navigate] = useLocation();
  const addDocumentTab = useDocumentStore((s) => s.addDocumentTab);
  const creatable = useCreatableDocTypes();

  const [docType, setDocType] = useState<DocTypeCode>('01');
  const [preparing, setPreparing] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [unmatched, setUnmatched] = useState(0);

  const available = DOCUMENT_TYPES.filter(
    (dt) => BILLABLE_DOC_TYPES.includes(dt.code) && creatable.some((c) => c.code === dt.code),
  );

  // Preview the match before committing, so "3 of 5 lines" is visible up front
  // rather than discovered as a half-empty cart.
  useEffect(() => {
    if (!open || !orgId) return;
    let cancelled = false;
    setMatched(null);
    void (async () => {
      const products = await readCachedProductsByIds(orgId, orderProductIds(order));
      if (cancelled) return;
      const draft = buildInvoiceTabFromOrder(order, docType, products);
      setMatched(draft.matchedLines);
      setUnmatched(draft.unmatchedLines.length);
    })();
    return () => { cancelled = true; };
  }, [open, orgId, order, docType]);

  useEffect(() => {
    if (!open) return;
    if (available.length > 0 && !available.some((dt) => dt.code === docType)) {
      setDocType(available[0].code);
    }
  }, [open, available, docType]);

  const start = async () => {
    if (!orgId) return;
    setPreparing(true);
    try {
      const products = await readCachedProductsByIds(orgId, orderProductIds(order));
      const { tab } = buildInvoiceTabFromOrder(order, docType, products);
      addDocumentTab(tab);
      onClose();
      navigate(documentEditorPath(tab.id));
    } finally {
      setPreparing(false);
    }
  };

  const totalLines = order.lines?.length ?? 0;
  const nothingToBill = matched === 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      closeLabel={t('common.close')}
      title={t('orders.invoice.title')}
      subtitle={`#${order.document_number}`}
      icon="fileText"
      width={460}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={preparing || matched === null || nothingToBill || available.length === 0}
            onClick={start}
          >
            {preparing ? <Spinner size={14} /> : t('orders.invoice.continue')}
          </Button>
        </div>
      }
    >
      <div className="px-5 py-4 flex flex-col gap-4">
        <p className="t-sm text-muted-foreground">{t('orders.invoice.description')}</p>

        <div>
          <div className="t-label mb-1.5">{t('orders.invoice.documentType')}</div>
          <div className="flex flex-wrap gap-2">
            {available.map((dt) => (
              <button
                key={dt.code}
                type="button"
                onClick={() => setDocType(dt.code)}
                className={`px-3.5 py-[5px] rounded-full text-xs font-medium border-[1.5px] cursor-pointer transition-all ${
                  docType === dt.code
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-transparent text-foreground'
                }`}
              >
                {t(`docTypes.${dt.code}`)}
              </button>
            ))}
          </div>
          {available.length === 0 && (
            <p className="t-xs text-destructive mt-1.5">{t('orders.invoice.noDocTypes')}</p>
          )}
        </div>

        <div className="card-surface-muted p-3.5">
          {matched === null ? (
            <div className="flex items-center gap-2 t-xs text-muted-foreground">
              <Spinner size={14} /> {t('orders.invoice.checkingLines')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Icon
                  name={nothingToBill ? 'alertTri' : 'checkCircle'}
                  size={15}
                  className={`flex-shrink-0 mt-0.5 ${nothingToBill ? 'text-warning' : 'text-success'}`}
                />
                <span className="t-xs text-muted-foreground">
                  {t('orders.invoice.matchedLines', { matched, total: totalLines })}
                </span>
              </div>
              {unmatched > 0 && (
                <div className="flex items-start gap-2">
                  <Icon name="info" size={15} className="text-info flex-shrink-0 mt-0.5" />
                  <span className="t-xs text-muted-foreground">
                    {t('orders.invoice.unmatchedHint', { n: unmatched })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="t-xs text-muted-foreground">{t('orders.invoice.reviewHint')}</p>
      </div>
    </Drawer>
  );
}
