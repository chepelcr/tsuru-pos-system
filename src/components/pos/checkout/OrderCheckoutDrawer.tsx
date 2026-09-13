import { useMemo, useState } from 'react';
import { useAssignment } from '@/hooks/useAssignment';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSessionContext } from '@/store/sessionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartFlow, type InvoiceCheckoutData } from '@/hooks/useCartFlow';
import { useClient } from '@/hooks/useClients';
import { useLinkOrderInvoice } from '@/hooks/useOrders';
import { useNotifications } from '@/contexts/NotificationsContext';
import { DocumentCurrencyProvider } from '@/contexts/DocumentCurrencyContext';
import { ClientDrawerForm } from '@/components/clients/ClientDrawerForm';
import { CheckoutDrawer } from './CheckoutDrawer';
import {
  cartItemsFromOrder,
  checkoutClientFromOrder,
  checkoutDataFromOrder,
} from '@/lib/orderToInvoice';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import type { DocTypeCode, CurrencyCode, InvoiceFormData } from '@/types/invoice';
import type { SaleReceiver } from '@/types/receiver';
import type { Order } from '@/types/order';

interface OrderCheckoutDrawerProps {
  open: boolean;
  order: Order;
  orgId: string;
  /** A delivered pedido is billed with a factura unless the caller says otherwise. */
  docType?: DocTypeCode;
  onClose: () => void;
  /** Fired after the document is issued — the caller refreshes the order. */
  onCompleted: () => void;
}

/**
 * "Facturar pedido" — the checkout drawer, over an order instead of the cart.
 *
 * This is the same `CheckoutDrawer` the POS uses, deliberately: the receiver,
 * the payments, the references, the copies and the retail-chain card are one
 * implementation, and the document is built by the same `useCartFlow` payload
 * builder. Only the LINES come from somewhere else.
 *
 * It replaced a flow that opened a document tab and navigated into the POS
 * workspace, which was wrong twice over. The user saw a full point-of-sale
 * screen they had not asked for, with the drawer on top of it — and the lines
 * had to survive a round-trip through the cart store, which needed every
 * product to be in the offline catalog cache. When one was not, the line was
 * dropped and the checkout opened showing a total of zero.
 *
 * So the lines are built from the ORDER's own rows here (they already carry
 * CABYS, net price, codes, taxes and discounts — see `cartItemsFromOrder`), no
 * catalog lookup is involved, and no document tab is created: billing an
 * existing pedido is not the authoring of a new document.
 */
export function OrderCheckoutDrawer({
  open,
  order,
  orgId,
  docType = '01',
  onClose,
  onCompleted,
}: OrderCheckoutDrawerProps) {
  const { t } = useLanguage();
  const { user } = useAuthContext();
  const { data: assignment } = useAssignment();
  const sessionCtx = useSessionContext();

  const [receiverDrawerOpen, setReceiverDrawerOpen] = useState(false);

  // The checkout form lives here rather than inside the drawer, because the
  // receiver drawer writes back into it — see `CheckoutDrawer.data`. Seeded
  // from the order on first render and owned by the user from then on.
  const [formData, setFormData] = useState<Partial<InvoiceFormData>>(() =>
    checkoutDataFromOrder(order)
  );
  const patchFormData = (patch: Partial<InvoiceFormData>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  // The order carries the client's name and identification, which is enough to
  // key the chain card and to identify the receiver. The full catalog row is
  // fetched on top of it for the email and address a document also wants —
  // when it resolves. Until then the order's own copy is already usable, so
  // the drawer never renders "no receiver" for an order that plainly has one.
  const { data: catalogClient } = useClient(orgId, order.client_id ?? undefined);
  const selectedClient: ClientSearchResult | null = useMemo(
    () => (catalogClient as ClientSearchResult | undefined) ?? checkoutClientFromOrder(order),
    [catalogClient, order]
  );

  const items = useMemo(() => cartItemsFromOrder(order), [order]);
  const currency: CurrencyCode | undefined = order.currency_code
    ? {
        currency_code: order.currency_code,
        exchange_rate: order.exchange_rate ?? 1,
      }
    : undefined;

  const flow = useCartFlow({ items, currency });
  const linkInvoice = useLinkOrderInvoice(orgId, order.document_number);
  const { add: notify } = useNotifications();

  const handleConfirm = async (invoiceData: InvoiceCheckoutData) => {
    if (!assignment || !user) throw new Error(t('checkout.error.sessionIncomplete'));
    const { branch_code, terminal_code, branch_id, terminal_id } = sessionCtx;
    if (!branch_code || !terminal_code || !branch_id || !terminal_id) {
      throw new Error(t('checkout.error.missingBranchTerminal'));
    }

    const result = await flow.handleConfirmPayment({
      assignmentId: assignment.assignment_id,
      orgId,
      userId: user.userId,
      branchNumber: branch_code,
      terminalNumber: terminal_code,
      branchId: branch_id,
      terminalId: terminal_id,
      selectedClient,
      invoiceData,
    });

    // Record on the ORDER which document billed it.
    //
    // Without this the order never learns it has an invoice: `isOrderInvoiced`
    // keeps returning false, "Facturar pedido" stays enabled, and a second
    // click emits a second real document and burns another consecutive for the
    // same delivery. The endpoint has existed since TSR-152 and nothing was
    // calling it.
    //
    // Only for a CONFIRMED sale: a queued one has no consecutive yet, and the
    // outbox replay is what will eventually produce it. Linking a `queued`
    // result would record an invoice that does not exist.
    if (result.status === 'confirmed' && result.sale?.sale_id) {
      try {
        await linkInvoice.mutateAsync({
          sale_id: result.sale.sale_id,
          document_type: result.sale.document_type,
          consecutive_number: result.sale.consecutive_number,
          document_key: result.sale.document_key,
          issued_on: result.sale.sale_date,
        });
      } catch (err) {
        // Deliberately not fatal: the document IS issued and legally exists, so
        // failing the checkout here would tell the cashier the sale did not
        // happen when it did. The cost of the link failing is that the order
        // still looks billable — which is why it is surfaced rather than
        // swallowed silently.
        notify({
          source: 'fe',
          level: 'destructive',
          titleKey: 'orders.invoice.linkFailed',
          bodyKey: err instanceof Error ? err.message : 'orders.invoice.linkFailed',
        });
      }
    }

    return result;
  };

  return (
    <DocumentCurrencyProvider currency={currency}>
      <CheckoutDrawer
        open={open}
        docType={docType}
        cartItems={flow.cartItems}
        cartTotal={flow.cartTotal}
        subtotal={flow.subtotal}
        taxAmount={flow.taxAmount}
        selectedClient={selectedClient}
        orgId={orgId}
        data={formData}
        onDataChange={patchFormData}
        onClose={onClose}
        onCompleted={onCompleted}
        onConfirm={handleConfirm}
        onEditReceiver={() => setReceiverDrawerOpen(true)}
        // The client comes from the order and is not re-pickable here: billing
        // a pedido for a different customer than it was captured for is a
        // different document, not an edit. The receiver itself stays editable.
        onSelectClient={() => {}}
      />

      <ClientDrawerForm
        open={receiverDrawerOpen}
        onClose={() => setReceiverDrawerOpen(false)}
        orgId={orgId}
        mode="receiver"
        receiver={(formData.receiver as SaleReceiver | undefined) ?? {}}
        selectedClient={selectedClient}
        onSaveReceiver={(receiver) => patchFormData({ receiver })}
      />
    </DocumentCurrencyProvider>
  );
}
