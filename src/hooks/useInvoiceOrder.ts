import { useState } from 'react';
import type { Order } from '@/types/order';

/**
 * "Facturar pedido" — open the checkout over an order.
 *
 * This is now bookkeeping only: which order is being billed, if any. The work
 * happens in `OrderCheckoutDrawer`, which the caller renders when this returns
 * one.
 *
 * It replaced two layers that both turned out to be wrong. First a modal asked
 * for the document type and previewed how many lines matched — neither question
 * earned the step it cost, since a delivered order is billed with a factura and
 * the line count is visible in the checkout the user lands on anyway. Then it
 * opened a document TAB and navigated into the POS workspace, which put a
 * full point-of-sale screen behind a drawer the user had not asked for, and
 * forced the order's lines through the cart store — where any product missing
 * from the offline catalog was dropped, so the checkout could open showing a
 * total of zero.
 *
 * Billing an existing pedido is not the authoring of a new document, so it gets
 * no tab and no editor; it gets the checkout drawer and nothing else.
 */
export function useInvoiceOrder() {
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);

  return {
    /** The order currently being billed, or null. Render the drawer on it. */
    billingOrder,
    invoiceOrder: setBillingOrder,
    closeInvoice: () => setBillingOrder(null),
  };
}
