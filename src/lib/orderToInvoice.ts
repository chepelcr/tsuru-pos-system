import type { DocumentTab } from "@/store/documentStore";
import { newDocTabId } from "@/store/documentStore";
import type { DocTypeCode } from "@/types/invoice";
import type { ChainClientInfo, Order, OrderLine } from "@/types/order";
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

/**
 * The order line's OWN fiscal detail, carried onto the invoice.
 *
 * The line already holds everything an electronic invoice needs — CABYS, net
 * price, the structured taxes and the discount cascade — filled in when the
 * order was captured (a POS line sends them; an Excel-imported line gets them
 * server-side). Rebuilding from the catalog product instead would quietly
 * re-price the sale: the customer agreed to the terms ON THE ORDER, and a
 * product whose price or discount changed since would produce an invoice that
 * does not match what was delivered.
 *
 * So the order wins wherever it has an answer, and the product fills the gaps.
 */
function lineDetailFromOrder(line: OrderLine): Record<string, unknown> | undefined {
  const detail: Record<string, unknown> = {};

  if (line.cabys) detail.cabys = line.cabys;
  if (line.net_price !== null && line.net_price !== undefined) {
    detail.net_price = Number(line.net_price);
  }
  // The three codes the chain reconciles against. Their own line, not the
  // product's: a client article code belongs to the customer, and the catalog
  // entry may carry a different one.
  if (line.internal_code) detail.internal_code = line.internal_code;
  if (line.code) detail.code = line.code;
  if (line.client_article_code) detail.client_article_code = line.client_article_code;

  const taxes = (line.taxes ?? []).filter(Boolean);
  if (taxes.length) detail.taxes = taxes;
  const discounts = (line.discounts ?? []).filter(Boolean);
  if (discounts.length) detail.discounts = discounts;

  return Object.keys(detail).length ? detail : undefined;
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
      // Keep the FIRST line's detail when a product repeats: folding two
      // quantities is safe, but merging two different tax or discount
      // structures is not, and silently averaging them would misdeclare.
      lineDetail: existing?.lineDetail ?? (lineDetailFromOrder(line) as never),
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
      // Retail-chain data travels from the order onto the document, so the
      // chain's own order number and delivery point reach the XML rather than
      // having to be retyped at checkout. Editable there — a partial delivery
      // can go to one store when the order named several.
      chain_info: chainInfoFromOrder(order),
    },
    cart_items: cartItems,
    selected_client: clientFromOrder(order),
    // Billing an order goes straight to checkout — see DocumentTab.auto_checkout.
    auto_checkout: true,
    is_dirty: false,
    opened_at: Date.now(),
  };

  return { tab, matchedLines, unmatchedLines };
}

/**
 * Retail-chain fields the order already captured.
 *
 * `undefined` when the order carries none, so an ordinary customer's document
 * gets no chain block at all rather than an object full of empty strings.
 */
function chainInfoFromOrder(order: Order): ChainClientInfo | undefined {
  // `department` is either the plain code the Excel import wrote or the
  // structured row the POS captured — both spellings live on the same field.
  const department =
    typeof order.department === "string"
      ? { department_code: order.department }
      : order.department ?? undefined;
  const location = order.delivery_location;

  const info: ChainClientInfo = {
    department_code: department?.department_code || undefined,
    store_code: location?.code || undefined,
    store_name: location?.name || undefined,
    gln: location?.gln || undefined,
    // The chain's own order number is the order's document number: on a
    // supplier order that IS the chain's purchase order, which is why it is
    // what they reconcile against.
    purchase_order_number: order.document_number || undefined,
  };
  return Object.values(info).some(Boolean) ? info : undefined;
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
