import type { DocumentTab } from "@/store/documentStore";
import { newDocTabId } from "@/store/documentStore";
import type { DocTypeCode } from "@/types/invoice";
import type { Order, OrderLine } from "@/types/order";
import type { Product } from "@/types";
import type { ClientSearchResult } from "@/hooks/useClientSearch";

/**
 * Turn a delivered order into a document-editor tab.
 *
 * A pedido is not a fiscal document and is not always billed — what ships, and
 * whether it is invoiced afterwards, is the user's call. When they do decide
 * to bill one, this rebuilds the same cart the POS would have had, so the
 * invoice goes through the normal checkout (taxes, discounts, receiver,
 * payments) instead of a second, divergent code path.
 *
 * **Lines are matched to catalog products by `product_id`.** The order line's
 * own copy of the description and price is flat — it has no tax structure and
 * no discounts — and an electronic invoice needs those. A line that cannot be
 * matched is reported rather than faked: inventing a product id would send the
 * BE something that does not exist, and inventing a CABYS would put a wrong
 * tax rate on a fiscal document. The caller tells the user how many lines need
 * adding by hand.
 */
export interface OrderInvoiceDraft {
  tab: DocumentTab;
  /** Lines rebuilt from a catalog product. */
  matchedLines: number;
  /** Lines the user has to add by hand — no `product_id`, or product gone. */
  unmatchedLines: OrderLine[];
}

/** Quantity on an order line, however the BE spelled it. */
function lineQuantity(line: OrderLine): number {
  return Number(line.quantity_ordered ?? line.units_ordered ?? 0) || 0;
}

/**
 * The order's client as the POS client picker would have it. Only usable when
 * the order carries `client_id` — without it there is no catalog client to
 * select, and the user picks or types the receiver in the checkout as usual.
 */
function clientFromOrder(order: Order): ClientSearchResult | null {
  if (!order.client_id) return null;
  return {
    client_id: order.client_id,
    business_name: order.client?.name ?? null,
    client_gln: order.client?.gln ?? null,
  };
}

export function buildInvoiceTabFromOrder(
  order: Order,
  docType: DocTypeCode,
  products: Map<string, Product>,
): OrderInvoiceDraft {
  const cartItems: NonNullable<DocumentTab["cart_items"]> = {};
  const unmatchedLines: OrderLine[] = [];
  let matchedLines = 0;

  for (const line of order.lines ?? []) {
    const product = line.product_id ? products.get(line.product_id) : undefined;
    if (!product) {
      unmatchedLines.push(line);
      continue;
    }

    const qty = lineQuantity(line);
    if (qty <= 0) continue;

    const existing = cartItems[product.product_id];
    cartItems[product.product_id] = {
      product,
      // An order can repeat a product across lines; the cart is keyed by
      // product, so fold the quantities the way adding it twice would.
      qty: (existing?.qty ?? 0) + qty,
      lineNote: line.description || undefined,
    };
    matchedLines += 1;
  }

  const tab: DocumentTab = {
    id: newDocTabId(),
    type: "new",
    title: `#${order.document_number}`,
    doc_type: docType,
    data: {
      document_type: docType,
      // The order number is the audit trail until the BE links the two records
      // (docs/MANUAL_ORDERS.md §7).
      notes: `Pedido #${order.document_number}`,
    },
    cart_items: cartItems,
    selected_client: clientFromOrder(order),
    is_dirty: false,
    opened_at: Date.now(),
  };

  return { tab, matchedLines, unmatchedLines };
}

/** Product ids an order references, for the catalog lookup. */
export function orderProductIds(order: Order): string[] {
  return (order.lines ?? [])
    .map((line) => line.product_id)
    .filter((id): id is string => !!id);
}

/** An order already billed must not be billed twice. */
export function isOrderInvoiced(order: Order): boolean {
  return !!order.invoice?.sale_id || !!order.invoice?.consecutive_number;
}
