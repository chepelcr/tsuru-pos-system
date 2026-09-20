import type { CartItem } from "@/store/cart";
import type { InvoiceFormData } from "@/types/invoice";
import type { ChainClientInfo, Order, OrderLine } from "@/types/order";
import type { Product } from "@/types";
import type { LineDetail } from "@/types/lineDetail";
import type { ClientSearchResult } from "@/hooks/useClientSearch";
import { lineTaxesFromStored } from "@/services/storedTaxToLineTax";
import { lineDiscountsFromStored } from "@/services/storedDiscountToLineDiscount";
import { isChainClient } from "@/lib/chainClients";

/**
 * Turn a delivered order into the inputs the checkout drawer needs.
 *
 * A pedido is not a fiscal document and is not always billed — what ships, and
 * whether it is invoiced afterwards, is the user's call. When they do decide to
 * bill one, this rebuilds the lines so the invoice goes through the normal
 * checkout (taxes, discounts, receiver, payments) instead of a second,
 * divergent code path.
 *
 * **The lines come from the ORDER, not from the catalog.** They already hold
 * everything an electronic invoice needs — CABYS, net price, the structured
 * taxes and the discount cascade — filled in when the order was captured: a POS
 * line sends them, and an imported line gets them server-side from the product.
 * Rebuilding from the catalog product instead would do two harmful things:
 *
 *   * it would quietly re-price the sale. The customer agreed to the terms ON
 *     THE ORDER, and a product whose price or discount has changed since would
 *     produce an invoice that does not match what was delivered.
 *   * it would need every product to be in the offline catalog cache, and a
 *     line whose product was missing got DROPPED. That is how billing an order
 *     opened a checkout showing a total of zero.
 *
 * So the order is authoritative and the catalog is not consulted at all.
 */


/** Quantity on an order line, however the BE spelled it. */
function lineQuantity(line: OrderLine): number {
  return Number(line.quantity_ordered ?? line.units_ordered ?? 0) || 0;
}

/** Unit price before tax, falling back to the gross price the import carried. */
function lineNetPrice(line: OrderLine): number {
  if (line.net_price !== null && line.net_price !== undefined) {
    return Number(line.net_price) || 0;
  }
  return Number(line.unit_price) || 0;
}

/**
 * The line's fiscal detail, in the shape the cart's engines read.
 *
 * `lineDetail` is what `useCartFlow` prefers over a product's own catalog
 * configuration, which is exactly right here: the order's copy IS the agreed
 * treatment, and it is already normalized to Hacienda code strings by the time
 * the BE stores it.
 */
function lineDetailFromOrder(line: OrderLine): Partial<LineDetail> {
  const detail: Partial<LineDetail> = {};

  if (line.cabys) detail.cabys = line.cabys;
  detail.net_price = lineNetPrice(line);

  // The rest of the document line, carried straight through. `unit_measure`
  // matters most: Hacienda requires `UnidadMedida` on every line, and without
  // it the invoice falls back to "Unid" — wrong for anything sold by weight.
  if (line.unit_measure) detail.unit_measure = line.unit_measure;
  if (line.commercial_unit_measure) {
    detail.commercial_unit_measure = line.commercial_unit_measure;
  }
  if (line.customs_part) detail.customs_part = line.customs_part;
  if (line.base_amount !== null && line.base_amount !== undefined) {
    detail.base_amount = Number(line.base_amount);
  }
  if (line.iva_collected_factory) {
    detail.iva_collected_factory = line.iva_collected_factory;
  }

  // The LINE's own codes, which is what the chain reconciles against — the
  // catalog product's array holds only the most recent import's.
  const codes = (line.codes ?? []).filter((c) => c?.number);
  if (codes.length) {
    detail.codes = codes.map((c) => ({
      code_type: c.code_type_id ?? undefined,
      number: c.number ?? undefined,
    }));
  }

  // The BE stores the canonical product shape (`tax_type_id`, `tax_rate`,
  // `tax_factor`, nested `special_fields.tax_amount`); the document wants
  // `LineTax`. `lineTaxesFromStored` owns that translation and is shared with
  // the cart's scan-and-charge path, so an order and a direct sale of the same
  // product cannot declare different tax. It also supplies the `rate_code`
  // derivation this function used to lack — which is what made a billed order
  // fail with `tax.rate_code is required when tax.code='01'`.
  const taxes = lineTaxesFromStored(line.taxes);
  if (taxes.length) detail.taxes = taxes;

  const discounts = lineDiscountsFromStored(line.discounts);
  if (discounts.length) detail.discounts = discounts;

  return detail;
}

/**
 * A product-shaped stand-in for an order line.
 *
 * The cart is keyed by product and its items carry a `Product`, but an order
 * line is not required to BE a catalog product — a hand-captured line need not
 * be one at all, and even when `product_id` is set the catalog row may not be
 * cached locally. Everything the checkout actually reads off the product is on
 * the line already, so it is filled in from there and the real product is never
 * needed.
 */
function productFromLine(line: OrderLine, key: string): Product {
  const netPrice = lineNetPrice(line);
  return {
    product_id: line.product_id || key,
    name: line.description || line.internal_code || key,
    description: line.description,
    // `price` is the NET price in the cart's vocabulary (`netPrice`), which is
    // what the tax engine prices off. `sale_price` is display-only.
    price: netPrice,
    sale_price: netPrice,
    image_url: null,
    status: 1,
    cabys: line.cabys ? { id: line.cabys, code: line.cabys } : null,
    unit_measure: line.unit_measure ?? undefined,
    // The line's own codes when it has them; the flattened trio otherwise,
    // which is what a row written before the line had a codes column carries.
    codes: (line.codes?.length
      ? line.codes.map((c) => ({
          code_type_id: c.code_type_id ?? "04",
          number: c.number ?? "",
        }))
      : [
          line.internal_code ? { code_type_id: "04", number: line.internal_code } : null,
          line.code ? { code_type_id: "03", number: line.code } : null,
          line.client_article_code
            ? { code_type_id: "02", number: line.client_article_code }
            : null,
        ].filter(Boolean)) as Product["codes"],
  } as Product;
}

/**
 * The order's lines as cart items, ready for `useCartFlow({ items })`.
 *
 * Keyed the way the cart is (by product), so an order that repeats a product
 * across lines folds the quantities the way adding it twice would. The FIRST
 * line's fiscal detail is kept when that happens: folding two quantities is
 * safe, but merging two different tax or discount structures is not, and
 * silently averaging them would misdeclare.
 */
export function cartItemsFromOrder(order: Order): Record<string, CartItem> {
  const items: Record<string, CartItem> = {};

  (order.lines ?? []).forEach((line, index) => {
    const qty = lineQuantity(line);
    if (qty <= 0) return;

    // A line with no product id still has to be billable, so it falls back to
    // a key of its own rather than being dropped.
    const key = line.product_id || `line-${line.line_number ?? index}`;
    const existing = items[key];

    items[key] = {
      product: existing?.product ?? productFromLine(line, key),
      qty: (existing?.qty ?? 0) + qty,
      lineNote: existing?.lineNote ?? (line.description || undefined),
      lineDetail: existing?.lineDetail ?? lineDetailFromOrder(line),
    };
  });

  return items;
}

/**
 * The order's client, in the shape the checkout's receiver logic expects.
 *
 * Used until (and if) the catalog row loads — it is enough to identify the
 * receiver and to key the retail-chain card, which is what the drawer needs
 * before anything else resolves.
 */
export function checkoutClientFromOrder(order: Order): ClientSearchResult | null {
  if (!order.client_id && !order.client?.name) return null;
  return {
    client_id: order.client_id ?? "",
    business_name: order.client?.name ?? null,
    client_gln: order.client?.gln ?? null,
    identification: order.client?.identification ?? null,
  };
}

/**
 * Form values the checkout should open with when billing this order.
 *
 * Everything here is a starting point, not a constraint: the user can still
 * change the delivery point, the note or the chain's order number before the
 * document goes out — a partial delivery can legitimately differ from what the
 * order said.
 */
export function checkoutDataFromOrder(order: Order): Partial<InvoiceFormData> {
  const data: Partial<InvoiceFormData> = {
    // Human-readable trace on the document itself. The machine-readable one is
    // `order_ref` below, which is what the validator actually links on.
    notes: `Pedido #${order.document_number}`,
    // Carried onto the document as `TsuruNumeroPedido` / `TsuruOrigenPedido`.
    // The link between order and document is made from THIS, asynchronously,
    // once Hacienda accepts — not by a call from the checkout.
    order_ref: {
      document_number: order.document_number || undefined,
      source: order.source || undefined,
    },
  };

  const chain = chainInfoFromOrder(order);
  if (chain) data.chain_info = chain;

  if (order.currency_code) {
    data.currency = {
      currency_code: order.currency_code,
      exchange_rate: order.exchange_rate ?? 1,
    };
  }

  return data;
}

/**
 * Retail-chain fields the order already captured.
 *
 * `undefined` for an ordinary customer, so their document gets no chain block
 * at all — which matters more than it looks: the chain block is what becomes
 * the `WM*` `OtroTexto` entries on the signed XML, and those are **Walmart's**
 * codes. Every order used to get one, because `purchase_order_number` was set
 * from `document_number` unconditionally and the "does it carry anything?"
 * check then always passed. A plain pedido `PM-000123` for a walk-in customer
 * therefore shipped `WMNumeroOrden` to Hacienda. Our own order number now
 * travels under our own codes instead — see `orderOtherFields` in
 * `hooks/useCartFlow`.
 *
 * Whether this is a chain order is decided BEFORE the order number is added,
 * from the fields only a chain produces. The registry (`lib/chainClients`)
 * cannot be the only signal: an order imported from a chain's spreadsheet
 * creates its client with no cédula — the file has no such column — so the
 * cédula lookup misses precisely on the path where chains are commonest. The
 * structural signals are the same ones `useChainClient` falls back to.
 *
 * `store_name` is deliberately NOT a signal: a manual pedido can carry a
 * free-text delivery label for a point the client never registered, and that
 * is not a chain.
 */
function chainInfoFromOrder(order: Order): ChainClientInfo | undefined {
  // `department` is either the plain code the Excel import wrote or the
  // structured row the POS captured — both spellings live on the same field.
  const department =
    typeof order.department === "string"
      ? { department_code: order.department }
      : order.department ?? undefined;
  const location = order.delivery_location;

  const fields = {
    department_code: department?.department_code || undefined,
    // The vendor number the chain assigns to us. store-be resolves it from the
    // order's department (`department_rel.supplier_code`) and returns it on the
    // DTO, so it is read here rather than derived again — and it is available
    // immediately, instead of waiting for the departments list to load and the
    // code→id back-fill to run.
    supplier_code:
      (typeof order.department === "string" ? undefined : order.department?.supplier_code) ||
      undefined,
    store_code: location?.code || undefined,
    store_name: location?.name || undefined,
    gln: location?.gln || undefined,
  };

  const isChain =
    isChainClient(order.client?.identification?.number, order.client?.gln) ||
    !!fields.supplier_code ||
    !!fields.gln ||
    !!fields.department_code ||
    !!fields.store_code;

  if (!isChain) return undefined;

  return {
    ...fields,
    // The chain's own order number is the order's document number: on a
    // supplier order that IS the chain's purchase order, which is why it is
    // what they reconcile against.
    purchase_order_number: order.document_number || undefined,
  };
}

/**
 * An order with a live document against it must not be billed again.
 *
 * True from the moment the document is EMITTED, not from the moment Hacienda
 * accepts it — sales-api claims the order at emission with status PROCESSING.
 * That is the point: waiting for the verdict left a window, seconds to minutes
 * wide, in which a real document existed, the order still looked billable, and
 * a second factura could be issued for the same delivery.
 *
 * False again once Hacienda REJECTS it: nothing was legally billed, so a
 * corrected document has to be issuable. The link stays on the order — it
 * records which document was refused — it just stops counting as billed.
 *
 * Mirrors `is_order_billed` in store-be's order_service.
 */
export function isOrderInvoiced(order: Order): boolean {
  const linked = !!order.document_id || !!order.document_info?.consecutive_number;
  return linked && order.document_info?.status !== ATV_REJECTED;
}

/** Hacienda verdict 3 — refused, so the order was never billed. */
const ATV_REJECTED = 3;

/** How far along the document billing this order is. */
export type OrderDocumentState =
  | "none"
  | "processing"
  | "accepted"
  | "partial"
  | "rejected";

/**
 * The document's state as the order knows it.
 *
 * `status` is the Hacienda verdict (0 processing, 1 accepted, 2 partial,
 * 3 rejected). A link with no status at all is a legacy row — those were
 * written by the old checkout POST, before a verdict existed to record — and
 * they are treated as accepted, which is what they meant at the time.
 */
export function orderDocumentState(order: Order): OrderDocumentState {
  // Checks the LINK, not `isOrderInvoiced` — a rejected document is not billed
  // but it is still worth showing, so the operator knows why the order came
  // back and what to correct.
  const linked = !!order.document_id || !!order.document_info?.consecutive_number;
  if (!linked) return "none";
  switch (order.document_info?.status) {
    case 0:
      return "processing";
    case 2:
      return "partial";
    case 3:
      return "rejected";
    default:
      return "accepted";
  }
}
