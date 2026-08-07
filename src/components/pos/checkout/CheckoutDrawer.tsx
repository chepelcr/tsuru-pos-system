import { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useAccordionSections } from '@/hooks/useAccordionSections';
import { useCart } from '@/store/cart';
import { useDocumentStore } from '@/store/documentStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDocumentCurrencyOptional } from '@/contexts/DocumentCurrencyContext';
import type {
  SalePayment,
  CurrencyCode,
  InvoiceFormData,
} from '@/types/invoice';
import type { InvoiceCheckoutData, SaleSubmissionResult } from '@/hooks/useCartFlow';
import type { SaleReceiver } from '@/types/receiver';
import type { SaleReference } from '@/types/reference';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import { PaymentSection } from './sections/PaymentSection';
import { ReceiverSection } from './sections/ReceiverSection';
import { DocumentSection } from './sections/DocumentSection';
import { ReferencesSection } from './sections/ReferencesSection';
import { CopiesSection } from './sections/CopiesSection';
import { Receipt } from './Receipt';


type Step = 'payment' | 'processing' | 'done';
type SectionId = 'payment' | 'receiver' | 'document' | 'references' | 'copies';

interface CartItem { id: string; name: string; price: number; qty: number; }

interface CheckoutDrawerProps {
  open: boolean;
  cartItems: CartItem[];
  cartTotal: number;
  subtotal: number;
  taxAmount: number;
  selectedClient: ClientSearchResult | null;
  orgId: string;
  /** Active document tab id — when present, all form state is persisted per-tab */
  tabId?: string;
  onClose: () => void;
  onCompleted: () => void;
  onConfirm: (invoiceData: InvoiceCheckoutData) => Promise<SaleSubmissionResult>;
  onEditReceiver: () => void;
  onSelectClient: (c: ClientSearchResult | null) => void;
}

const DEFAULT_DOC_DATA = {
  sale_condition: '01',
  activity_code: '',
  credit_term: '0',
  currency: { currency_code: 'CRC', exchange_rate: 1 } as CurrencyCode,
  notes: '',
};

export function CheckoutDrawer({
  open,
  cartItems,
  cartTotal,
  subtotal,
  taxAmount,
  selectedClient,
  orgId,
  tabId,
  onClose,
  onCompleted,
  onConfirm,
  onEditReceiver,
  onSelectClient,
}: CheckoutDrawerProps) {
  const { doc_type } = useCart();
  const { t } = useLanguage();
  const { fmtConverted: fmt } = useDocumentCurrencyOptional();
  const [step, setStep] = useState<Step>('payment');
  const [result, setResult] = useState<SaleSubmissionResult>();
  const [receiptSummary, setReceiptSummary] = useState({ total: 0, itemCount: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('payment');
    setResult(undefined);
    setReceiptSummary({ total: 0, itemCount: 0 });
    setError(null);
  }, [open]);

  // ─── Per-tab form state ────────────────────────────────────────────────
  const tabData = useDocumentStore((s) =>
    tabId ? s.open_documents.find((d) => d.id === tabId)?.data ?? null : null
  );
  const updateDocumentTab = useDocumentStore((s) => s.updateDocumentTab);
  const [localData, setLocalData] = useState<Partial<InvoiceFormData>>({});
  const data: Partial<InvoiceFormData> = tabId ? tabData ?? {} : localData;

  const updateData = (patch: Partial<InvoiceFormData>) => {
    if (tabId) {
      updateDocumentTab(tabId, { data: { ...data, ...patch }, is_dirty: true });
    } else {
      setLocalData((prev) => ({ ...prev, ...patch }));
    }
  };

  const payments: SalePayment[]     = data.payments ?? [];
  const receiver: SaleReceiver      = data.receiver ?? {};
  const references: SaleReference[] = data.references ?? [];
  const copyEmails: string[]        = data.copy_emails ?? [];
  const docData = {
    sale_condition: data.sale_condition ?? DEFAULT_DOC_DATA.sale_condition,
    activity_code:  data.activity_code  ?? DEFAULT_DOC_DATA.activity_code,
    credit_term:    data.credit_term    ?? DEFAULT_DOC_DATA.credit_term,
    currency:       data.currency       ?? DEFAULT_DOC_DATA.currency,
    notes:          data.notes          ?? DEFAULT_DOC_DATA.notes,
  };

  // ─── Doc-type derived flags (Hacienda code strings) ────────────────────
  const needsReceiver = doc_type !== '04'; // All except Tiquete
  const needsReferences = doc_type === '03' || doc_type === '02'; // NC / ND
  const isPaid = payments.reduce((s, p) => s + p.amount, 0) >= cartTotal;
  const hasReceiver = !!(receiver.name || selectedClient?.business_name || selectedClient?.client_name);

  // ─── Section expansion (drawer is orchestrator only) ───────────────────
  const { expanded, toggle } = useAccordionSections<SectionId>({
    payment: true,
    receiver: needsReceiver && !hasReceiver,
    document: false,
    references: needsReferences && references.length === 0,
    copies: false,
  });

  const validate = (): string | null => {
    if (!isPaid) return t('checkout.error.notPaid');
    if (!docData.activity_code) return t('checkout.error.activityRequired');
    if (needsReceiver && !hasReceiver) return t('checkout.error.receiverRequired');
    if (needsReferences && references.length === 0) return t('checkout.error.referencesRequired');
    // Hacienda payment code "99" (Otros) requires `other_type` description.
    const otherWithoutType = payments.find(
      (p) => p.type === '99' && !p.other_type?.trim()
    );
    if (otherWithoutType) return t('checkout.error.otherTypeRequired');
    return null;
  };

  const handleConfirm = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setReceiptSummary({ total: cartTotal, itemCount: cartItems.length });
    setStep('processing');

    const invoiceData = {
      ...docData,
      document_type: doc_type,
      receiver: needsReceiver ? receiver : null,
      references: needsReferences ? references : [],
      copy_emails: copyEmails.filter(Boolean),
      payments,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: 0,
      total_amount: cartTotal,
    };

    try {
      const submission = await onConfirm(invoiceData);
      setResult(submission);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('checkout.error.processing'));
      setStep('payment');
    }
  };

  const title =
    step === 'payment'    ? t('checkout.finalize')   :
    step === 'processing' ? t('common.processing') :
                            t('checkout.completed');

  const footer =
    step === 'payment' ? (
      <div className="p-4 bg-card space-y-2">
        {error && (
          <div className="text-[12px] text-destructive text-center">{error}</div>
        )}
        <button
          onClick={handleConfirm}
          disabled={!isPaid}
          className="w-full h-12 rounded-md bg-primary text-primary-foreground font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('checkout.confirmWith', { amount: fmt(cartTotal) })}
          <span>›</span>
        </button>
      </div>
    ) : undefined;

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      dismissible={step !== 'processing'}
      onClose={step === 'done' ? onCompleted : onClose}
      title={title}
      icon="cart"
      width={520}
      footer={footer}
    >
      {step === 'payment' && (
        <div className="flex flex-col gap-3 px-4 py-4">
          {/* Sections */}
          <PaymentSection
            isExpanded={expanded.payment}
            onToggle={() => toggle('payment')}
            cartTotal={cartTotal}
            payments={payments}
            onChange={(next) => updateData({ payments: next })}
          />

          <ReceiverSection
            isExpanded={expanded.receiver}
            onToggle={() => toggle('receiver')}
            orgId={orgId}
            receiver={receiver}
            selectedClient={selectedClient}
            onSelectClient={onSelectClient}
            onEditReceiver={onEditReceiver}
            needsReceiver={needsReceiver}
          />

          <DocumentSection
            isExpanded={expanded.document}
            onToggle={() => toggle('document')}
            data={docData}
            onChange={(p) => updateData(p)}
          />

          {needsReferences && (
            <ReferencesSection
              isExpanded={expanded.references}
              onToggle={() => toggle('references')}
              references={references}
              onChange={(next) => updateData({ references: next })}
            />
          )}

          <CopiesSection
            isExpanded={expanded.copies}
            onToggle={() => toggle('copies')}
            emails={copyEmails}
            onChange={(next) => updateData({ copy_emails: next })}
          />
        </div>
      )}

      {step === 'processing' && (
        <div className="px-6 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="font-display font-bold text-[18px]">{t('checkout.processingSale')}</div>
          <div className="text-[12px] text-muted-foreground space-y-1">
            <div>{t('checkout.step.validating')}</div>
            <div>{t('checkout.step.saving')}</div>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t('checkout.step.sending')}
            </div>
          </div>
        </div>
      )}

      {step === 'done' && (
        <Receipt
          result={result}
          cartTotal={receiptSummary.total}
          itemCount={receiptSummary.itemCount}
          onClose={onCompleted}
        />
      )}
    </Drawer>
  );
}
