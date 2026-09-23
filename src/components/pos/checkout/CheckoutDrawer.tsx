import { useEffect, useRef, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorToast } from '@/components/ui/ErrorToast';
import { useAccordionSections } from '@/hooks/useAccordionSections';
import { useCart } from '@/store/cart';
import { useDocumentStore } from '@/store/documentStore';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DOC_TYPES_REQUIRING_REFERENCE,
  LOCAL_EXEMPTION_CODES,
  MAX_REFERENCES,
  ReferenceActionCode,
  ReferenceDocType,
} from '@/lib/enums';
import type { LineDetail, LineTax } from '@/types/lineDetail';
import { useDocumentCurrencyOptional } from '@/contexts/DocumentCurrencyContext';
import { isManualOrderDocType } from '@/types/invoice';
import type {
  SalePayment,
  CurrencyCode,
  EditorDocTypeCode,
  InvoiceFormData,
} from '@/types/invoice';
import type { ManualOrderFields } from '@/types/order';
import type { InvoiceCheckoutData, SaleSubmissionResult } from '@/hooks/useCartFlow';
import type { SaleReceiver } from '@/types/receiver';
import {
  hasReceiver as resolveHasReceiver,
  resolveReceiverId,
} from '@/lib/receiverResolution';
import type { SaleReference } from '@/types/reference';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import { PaymentSection } from './sections/PaymentSection';
import { ReceiverSection } from './sections/ReceiverSection';
import { DocumentSection } from './sections/DocumentSection';
import { ReferencesSection } from './sections/ReferencesSection';
import { OrderInfoSection } from './sections/OrderInfoSection';
import { BranchTerminalSection } from './sections/BranchTerminalSection';
import { useChainClient } from '@/hooks/useChainClient';
import type { ChainClientInfo } from '@/types/order';
import { CopiesSection } from './sections/CopiesSection';
import { OtherChargesSection } from './sections/OtherChargesSection';
import { otherChargesTotal, resolveOtherCharges, validateOtherCharges } from '@/lib/otherCharges';
import { roundMoney } from '@/lib/money';
import { Receipt } from './Receipt';
import { useSessionContext } from '@/store/sessionContext';


type Step = 'payment' | 'processing' | 'done';
type SectionId =
  | 'payment'
  | 'receiver'
  | 'document'
  | 'references'
  | 'otherCharges'
  | 'copies'
  | 'chainClient'
  | 'branchTerminal';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  /**
   * The line's fiscal detail, when the drawer (or the order it came from) set
   * one. The caller has always passed this; the local type simply narrowed it
   * away, which meant the checkout could not see that a line carried a LOCAL
   * exemption — and a Factura granting one MUST reference the authorization.
   */
  lineDetail?: Partial<LineDetail>;
}

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
  /**
   * Document type, when the caller owns it rather than the POS cart.
   *
   * The drawer used to read `doc_type` straight out of the cart store, which
   * tied it to a live POS session: billing a pedido had to push a document type
   * into that store first, and whatever the cashier had open changed underneath
   * them. A caller that knows its own document type passes it here.
   */
  docType?: EditorDocTypeCode;
  /**
   * The pedido being billed, when this checkout is billing one.
   *
   * Billing an order emits an ordinary electronic document, so nothing in the
   * cart, the doc type or the result marks it as different from a walk-in sale
   * — only the caller knows. It changes what the drawer is called ("Facturar
   * pedido"), what it says when it finishes ("Pedido facturado") and what the
   * last button offers: "Cerrar", not "Nueva venta", because the cashier came
   * here to settle one specific pedido and is not mid-shift at a till.
   */
  billedOrderNumber?: string;
  /**
   * Form state owned by the CALLER, making the drawer fully controlled.
   *
   * Three modes, in precedence order:
   *   1. `data` + `onDataChange` — the caller owns it. Billing a pedido works
   *      this way: it seeds the form from the order and needs to write the
   *      edited receiver back into it, which it cannot do through state the
   *      drawer keeps to itself.
   *   2. `tabId` — persisted per document tab in `documentStore`, so an
   *      authored document survives a tab switch.
   *   3. neither — local state, for a one-off checkout.
   */
  data?: Partial<InvoiceFormData>;
  onDataChange?: (patch: Partial<InvoiceFormData>) => void;
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
  docType,
  billedOrderNumber,
  data: controlledData,
  onDataChange,
  onClose,
  onCompleted,
  onConfirm,
  onEditReceiver,
  onSelectClient,
}: CheckoutDrawerProps) {
  const cartDocType = useCart((s) => s.doc_type);
  const doc_type = docType ?? cartDocType;
  const { t } = useLanguage();
  const { fmtConverted: fmt } = useDocumentCurrencyOptional();
  const [step, setStep] = useState<Step>('payment');
  const [result, setResult] = useState<SaleSubmissionResult>();
  const [receiptSummary, setReceiptSummary] = useState({ total: 0, itemCount: 0 });
  const [error, setError] = useState<string | null>(null);

  // ─── Per-tab form state ────────────────────────────────────────────────
  const tabData = useDocumentStore((s) =>
    tabId ? s.open_documents.find((d) => d.id === tabId)?.data ?? null : null
  );
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const updateDocumentTab = useDocumentStore((s) => s.updateDocumentTab);
  const [localData, setLocalData] = useState<Partial<InvoiceFormData>>({});
  const data: Partial<InvoiceFormData> =
    controlledData ?? (tabId ? tabData ?? {} : localData);

  const updateData = (patch: Partial<InvoiceFormData>) => {
    if (onDataChange) {
      onDataChange(patch);
    } else if (tabId) {
      updateDocumentTab(tabId, { data: { ...data, ...patch }, is_dirty: true });
    } else {
      setLocalData((prev) => ({ ...prev, ...patch }));
    }
  };

  useEffect(() => {
    if (!open) return;
    setStep('payment');
    setResult(undefined);
    setReceiptSummary({ total: 0, itemCount: 0 });
    setError(null);
  }, [open]);

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
  // `PM` is the internal manual-order type: not a fiscal document, so no
  // activity code, no Hacienda references, and no requirement that the order
  // be paid in full at capture time (a pedido is normally settled later).
  const session = useSessionContext();
  const isManualOrder = isManualOrderDocType(doc_type);
  const needsReceiver = isManualOrder || doc_type !== '04'; // All except Tiquete

  // References: AVAILABLE on every fiscal document, REQUIRED on only some.
  //
  // These used to be one flag, which both hid the section and — worse —
  // discarded whatever it held for any type other than NC/ND. But the spec makes
  // references mandatory in five situations, not two ("Obligatorio en NC, ND,
  // REP, FEC (si sustituye o es proveedor extranjero), o FE con exoneraciones
  // locales"), and five of the reference codes describe a Factura REPLACING an
  // earlier comprobante — substituting a provisional contingency receipt (05),
  // substituting an electronic document (07), an endorsed invoice (08). Gating
  // them to credit notes made the contingency path unreachable.
  const hasLocalExemption = cartItems.some((item) =>
    (item.lineDetail?.taxes ?? []).some((tax: LineTax) =>
      LOCAL_EXEMPTION_CODES.includes(tax.exemption?.type ?? ''),
    ),
  );
  const referencesRequired =
    !isManualOrder &&
    (DOC_TYPES_REQUIRING_REFERENCE.includes(doc_type) ||
      // An FE granting a LOCAL exemption (Nota 10.1 code 04 or 11) must
      // reference the authorization.
      (doc_type === '01' && hasLocalExemption));
  // A pedido is not a fiscal document and carries no Hacienda references.
  const referencesAvailable = !isManualOrder;
  // OtrosCargos (TSR-125): not on a pedido (the POS issues no REP). The charges
  // add to TotalComprobante, so the amount due — what the payments must EQUAL —
  // is the cart plus the charges.
  const otherChargesAvailable = !isManualOrder;
  const otherCharges = otherChargesAvailable ? data.other_charges ?? [] : [];
  const resolvedOtherCharges = resolveOtherCharges(otherCharges, subtotal);
  const chargesTotal = otherChargesTotal(otherCharges, subtotal);
  const documentTotal = roundMoney(cartTotal + chargesTotal);
  const otherChargeErrors = validateOtherCharges(otherCharges, doc_type);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  // Money is compared at céntimo precision rather than as raw floats: cart
  // totals carry fractional céntimos (a ₡4 749 cart is really 4749.4013…) while
  // a payment is whole colones, so a bare `>=` can read a fully-paid sale as
  // short by a rounding error.
  const toCentimos = (n: number) => Math.round(n * 100);
  const isPaid = toCentimos(paidTotal) >= toCentimos(documentTotal);
  // One resolver for every surface — the three call sites used to disagree
  // on precedence, so the same client showed a different name in each.
  const hasReceiver = resolveHasReceiver(receiver, selectedClient);
  const manualOrder: ManualOrderFields = data.manual_order ?? {};

  // Retail chains that require extra data on their documents. Keyed on the
  // CLIENT's identification number, not on our org's business type: it is the
  // customer who imposes the requirement, and the same org invoices ordinary
  // customers too. Null for everyone else, so the card simply does not exist.
  // Every identity we hold for this customer is offered, because the two routes
  // into this drawer know different things. `??` on a single field was the
  // original bug — an untouched receiver carries `number: ''`, which is not
  // nullish, so the fallback never ran — but fixing it was not enough: a
  // customer whose client row came from an imported order has NO cédula at all
  // (the spreadsheet has no such column), so there is nothing for the registry
  // to match. `useChainClient` falls back to the client's own departments and
  // delivery points, which that import does create.
  const chainState = useChainClient({
    orgId,
    clientId: selectedClient?.client_id,
    identifiers: [
      resolveReceiverId(receiver, selectedClient),
      selectedClient?.client_gln,
    ],
  });
  const chain = chainState.chain;
  const chainInfo: ChainClientInfo = data.chain_info ?? {};
  const hasLines = cartItems.length > 0;

  // ─── Section expansion (drawer is orchestrator only) ───────────────────
  const { expanded, toggle } = useAccordionSections<SectionId>({
    // A manual order has no payment to take — it is settled later — so that
    // card is not rendered for it at all.
    payment: !isManualOrder,
    receiver: needsReceiver && !hasReceiver,
    // Opens for a pedido: Documento now carries the delivery point and the
    // delivery date, which are the whole point of capturing one, and the
    // drawer refuses to save without a delivery location.
    document: isManualOrder,
    references: referencesRequired && references.length === 0,
    otherCharges: false,
    copies: false,
    // Opens by default: if a chain needs these, they are not optional.
    chainClient: chainState.show,
    // Collapsed: it is auto-answered for almost every organization, so it is
    // there to be checked and overridden, not to be filled in.
    branchTerminal: false,
  });

  const validate = (): string | null => {
    if (isManualOrder) {
      if (!hasLines) return t('manualOrder.error.noLines');
      if (!hasReceiver) return t('manualOrder.error.clientRequired');
      // Either a registered point or a real address — the free-text blob that
      // used to satisfy this is gone.
      const loc = manualOrder.delivery_location;
      if (!loc?.store_id && !loc?.address?.trim()) {
        return t('manualOrder.error.deliveryRequired');
      }
      return null;
    }
    if (otherChargeErrors.length) return t(otherChargeErrors[0]);
    if (!isPaid) return t('checkout.error.notPaid');
    // sales-api validates the branch and terminal IDENTIFIERS against the
    // organization, so an unresolved pair — or one left over from another
    // organization — fails server-side with "Branch <uuid> not found for
    // organization", naming a branch this cashier has never seen. Say what is
    // actually wrong, before a consecutive is at stake.
    if (!session.branch_id || !session.terminal_id) {
      return t('checkout.error.branchRequired');
    }
    if (!docData.activity_code) return t('checkout.error.activityRequired');
    if (needsReceiver && !hasReceiver) return t('checkout.error.receiverRequired');
    if (referencesRequired && references.length === 0) return t('checkout.error.referencesRequired');
    // The reference fields the backend requires but the form used to leave
    // optional. Each of these is otherwise caught only when the XML is built —
    // which happens after the consecutive has been allocated.
    const badReference = references.find(
      (r) =>
        !r.type?.trim() ||
        !r.code?.trim() ||
        !r.number?.trim() ||
        !r.date?.trim() ||
        !r.reason?.trim() ||
        (r.type === ReferenceDocType.OTHER && !r.other_type?.trim()) ||
        (r.code === ReferenceActionCode.OTHER && !r.other_code?.trim()),
    );
    if (badReference) return t('checkout.error.referenceIncomplete');
    if (references.length > MAX_REFERENCES) {
      return t('checkout.references.maxReached', { max: MAX_REFERENCES });
    }
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
    setReceiptSummary({ total: documentTotal, itemCount: cartItems.length });
    setStep('processing');

    const invoiceData = {
      ...docData,
      document_type: doc_type,
      receiver: needsReceiver ? receiver : null,
      // Sent as captured for EVERY document type. This used to be emptied for
      // anything that was not a credit or debit note, so a reference the user had
      // entered was silently thrown away on the way to the document.
      references: referencesAvailable ? references : [],
      copy_emails: copyEmails.filter(Boolean),
      // A pedido carries no payments: it is settled after delivery.
      payments: isManualOrder ? [] : payments,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: 0,
      total_amount: documentTotal,
      other_charges: resolvedOtherCharges,
      other_charges_total: chargesTotal,
      manual_order: isManualOrder ? manualOrder : undefined,
      chain_info: data.chain_info,
      order_ref: data.order_ref,
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

  // Billing a pedido is its own mode: same document, different errand.
  const isBillingOrder = !!billedOrderNumber;

  const title =
    step === 'payment'
      ? isBillingOrder
        ? t('checkout.orderMode.finalize')
        : isManualOrder
          ? t('manualOrder.finalize')
          : t('checkout.finalize')
      : step === 'processing'
        ? t('common.processing')
        : isBillingOrder
          ? t('checkout.orderMode.completed')
          : t('checkout.completed');

  const footer =
    step === 'payment' ? (
      <div className="p-4 bg-card space-y-2">
        <button
          ref={confirmButtonRef}
          onClick={handleConfirm}
          disabled={isManualOrder ? !hasLines : !isPaid}
          className="w-full h-12 rounded-md bg-primary text-primary-foreground font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isManualOrder
            ? manualOrder.is_quote
              ? t('manualOrder.confirmQuote')
              : t('manualOrder.confirmWith', { amount: fmt(documentTotal) })
            : t('checkout.confirmWith', { amount: fmt(documentTotal) })}
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
      icon={isManualOrder ? 'package' : 'cart'}
      width={520}
      footer={footer}
      notification={error && step === 'payment' && (
        <ErrorToast
          title={t('checkout.error.title')}
          message={error}
          dismissLabel={t('checkout.error.dismiss')}
          onDismiss={() => {
            setError(null);
            confirmButtonRef.current?.focus();
          }}
        />
      )}
    >
      {step === 'payment' && (
        <div className="flex flex-col gap-3 px-4 py-4">
          {/* Sections */}
          {/* A pedido is settled later, so payment does not belong on it. */}
          {!isManualOrder && (
            <PaymentSection
              isExpanded={expanded.payment}
              onToggle={() => toggle('payment')}
              cartTotal={documentTotal}
              payments={payments}
              onChange={(next) => updateData({ payments: next })}
            />
          )}

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

          {/* One Documento card for both kinds. A PM used to hide this and
              render a Pedido card that re-declared sale condition, activity
              code and currency, with its Comentario standing in for Notas —
              so which card you filled in depended on the document type for no
              reason a cashier could see. The pedido-only fields now live
              inside this one. */}
          <DocumentSection
            isExpanded={expanded.document}
            onToggle={() => toggle('document')}
            data={docData}
            onChange={(p) => updateData(p)}
            manualOrder={isManualOrder ? manualOrder : undefined}
            onManualOrderChange={
              isManualOrder
                ? (patch) => updateData({ manual_order: { ...manualOrder, ...patch } })
                : undefined
            }
            orgId={orgId}
          />

          {/* Shown for a pedido too. It was hidden on the grounds that a pedido
              has no Hacienda consecutive to segment — but the manual-order
              payload sends `branch_number` and `terminal_number` all the same
              (`useCartFlow`), so the flow required a branch and terminal while
              giving no way to see or change which. `useSessionSelection`
              resolves them automatically; this is where you check or override
              what it chose. */}
          <BranchTerminalSection
            isExpanded={expanded.branchTerminal}
            onToggle={() => toggle('branchTerminal')}
            orgId={orgId}
          />

          {/* Also shown for every manual order, not only a chain's: composing a
              pedido is exactly when its number, due date and proforma flag are
              decided. Those three used to sit in the Documento card, which put
              order facts under a document heading. */}
          {(chainState.show || !!billedOrderNumber || isManualOrder) && (
            <OrderInfoSection
              isExpanded={expanded.chainClient}
              onToggle={() => toggle('chainClient')}
              orderNumber={billedOrderNumber}
              isChainClient={chainState.show}
              isManualOrder={isManualOrder}
              isQuote={!!manualOrder.is_quote}
              documentNumber={manualOrder.document_number}
              deliveryDate={manualOrder.delivery_date}
              onManualOrderChange={
                isManualOrder
                  ? (patch) => updateData({ manual_order: { ...manualOrder, ...patch } })
                  : undefined
              }
              chain={chain}
              data={chainInfo}
              orgId={orgId}
              clientId={selectedClient?.client_id}
              deliveryLocation={manualOrder.delivery_location}
              receiver={receiver}
              selectedClient={selectedClient}
              onChange={(patch) =>
                updateData({ chain_info: { ...chainInfo, ...patch } })
              }
            />
          )}

          {referencesAvailable && (
            <ReferencesSection
              isExpanded={expanded.references}
              onToggle={() => toggle('references')}
              references={references}
              onChange={(next) => updateData({ references: next })}
              documentType={isManualOrder ? undefined : doc_type}
              required={referencesRequired}
            />
          )}

          {otherChargesAvailable && (
            <OtherChargesSection
              isExpanded={expanded.otherCharges}
              onToggle={() => toggle('otherCharges')}
              charges={otherCharges}
              onChange={(next) => updateData({ other_charges: next })}
              linesSubtotal={subtotal}
              errors={otherChargeErrors}
            />
          )}

          {/* Copy recipients are a Hacienda notification concern — a manual
              order is never emailed by the invoicing service. */}
          {!isManualOrder && (
            <CopiesSection
              isExpanded={expanded.copies}
              onToggle={() => toggle('copies')}
              emails={copyEmails}
              onChange={(next) => updateData({ copy_emails: next })}
            />
          )}
        </div>
      )}

      {step === 'processing' && (
        <div className="px-6 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="font-display font-bold text-[18px]">
            {isManualOrder ? t('manualOrder.processing') : t('checkout.processingSale')}
          </div>
          <div className="text-[12px] text-muted-foreground space-y-1">
            <div>{t('checkout.step.validating')}</div>
            <div>{t('checkout.step.saving')}</div>
            {!isManualOrder && (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {t('checkout.step.sending')}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'done' && (
        <Receipt
          result={result}
          cartTotal={receiptSummary.total}
          itemCount={receiptSummary.itemCount}
          onClose={onCompleted}
          billedOrderNumber={billedOrderNumber}
        />
      )}
    </Drawer>
  );
}
