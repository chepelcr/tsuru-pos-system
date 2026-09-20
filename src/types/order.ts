/**
 * Store / marketplace ORDER types (cross-app-be `orders` domain) — distinct
 * from POS electronic invoices (sales).
 *
 * Promoted out of `src/hooks/useOrders.ts` (plan 01 — Orders + Confirmations)
 * and extended with the fields the dashboard's full Orders module needs:
 * report colors, cross-docking (order type `73`), totals, attachments.
 *
 * All field names are snake_case to match the cross-app-be DTOs.
 *
 * NOTE: `src/hooks/useOrders.ts` currently declares its own copies of
 * `Order`/`OrderLine`/etc. The plan calls for the hook to re-export from THIS
 * file for back-compat. That edit lives in `useOrders.ts` (outside this
 * scaffolding step's allowed scope) — see openIssues.
 */

// ─── Status model ────────────────────────────────────────────────────────────
// pending → processing → shipped → delivered, plus cancelled (terminal).
// Numeric map sent to the BE: pending=1, processing=2, shipped=3, delivered=4,
// cancelled=5. Shared by orders AND confirmations.

export const ORDER_STATUSES = [
  'quote',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Numeric status map the BE expects for status PATCH bodies.
 *
 * `quote` is 0 because it PRECEDES pending: a proforma has not been placed yet.
 * It is a status, not a document type — which is why approving one is a status
 * change and "Facturar pedido" needs no special case for it.
 */
export const ORDER_STATUS_CODES: Record<OrderStatus, number> = {
  quote: 0,
  pending: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
};

/**
 * Which statuses an order may move to next. Mirrors the BE guard — the server
 * is the authority, this only keeps the UI from offering an action that would
 * be rejected.
 *
 * A quote may only be approved or cancelled: allowing it to jump to delivered
 * would let an unapproved cotización be invoiced.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  quote: ['pending', 'cancelled'],
  pending: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** True when the order is a proforma awaiting the customer's approval. */
export function isQuote(order: { order_status?: OrderStatus | string }): boolean {
  return order.order_status === 'quote';
}

// ─── Report colour schemes ─────────────────────────────────────────────────
// The visual values live in the theme layer; re-export the public contract here
// so existing order consumers keep a stable import path.

import type { ReportColorScheme } from '@/theme/reportColors';
export { REPORT_COLOR_OPTIONS } from '@/theme/reportColors';
export type { ReportColorOption, ReportColorPalette, ReportColorScheme } from '@/theme/reportColors';

// ─── Sub-types matching backend DTOs ────────────────────────────────────────

export interface OrderParty {
  name: string;
  gln: string;
  internal_code?: string;
  /** Some org responses include the party logo. */
  logo_url?: string;
  /**
   * Tax identification (cédula física / jurídica / DIMEX / NITE).
   *
   * Needed twice when the order is billed: it identifies the receiver on the
   * document, and it is what decides whether the customer is a retail chain
   * with extra requirements — see `lib/chainClients`, which matches on the
   * NUMBER because a name is not a stable identifier for a taxpayer.
   */
  identification?: { code?: string | null; number?: string | null } | null;
}

/**
 * Department reference. Some org responses send a plain string code; others send
 * a nested object. Both are coerced to a display label via `text()` in the UI.
 */
export interface OrderDepartment {
  department_code: string;
  name?: string;
  supplier_code?: string;
}

export interface DeliveryLocation {
  code: string;
  name: string;
  gln: string;
  latitude?: string;
  longitude?: string;
}

export interface OrderAttachments {
  pdf_url?: string;
  excel_url?: string;
  nuevo_reporte_url?: string;
  /**
   * 80mm thermal ticket (TSR-127), rendered SERVER-SIDE like every other
   * document format. Not a browser print view — so a reprint is identical to
   * the original and one can be emailed later. Generated on demand via
   * `POST /orders/{document_number}/ticket`.
   */
  ticket_url?: string;
}

/**
 * Per-unit parameters for the specific excises, in the shape store-be PERSISTS.
 *
 * Note `tax_amount` is nested here. The document's `TaxSpecialFields` flattens
 * the same data to `tax_amount_id` / `tax_unit_amount`, so the two are not
 * interchangeable — `specialFieldsToDocument` converts. Passing this straight
 * through (which an `as never` cast used to allow) left every excise with no
 * per-unit amount, and it priced at zero.
 */
export interface OrderLineTaxSpecialFields {
  quantity?: number | null;
  percentage?: number | null;
  /** Proporción de alcohol absoluto = cantidad × grado (Nota 8). */
  proportion?: number | null;
  volume_consumption?: number | null;
  tax_amount?: { id?: string | number; amount?: number | null } | null;
}

/** One tax on an order line — mirrors the product's stored tax shape. */
export interface OrderLineTax {
  tax_type_id?: string;
  tax_rate?: { id?: string; percentage?: number; code?: string } | null;
  /** IVARBU (code 08) multiplier. `tax = subtotal × factor`; the rate is NOT
   *  applied on top of it. */
  tax_factor?: { id?: string; factor?: number | null } | null;
  other_tax_type?: string | null;
  special_fields?: OrderLineTaxSpecialFields | null;
  is_amount?: boolean | null;
  amount?: number | null;
}

/** One discount on an order line, in Hacienda Nota 20 cascade order. */
export interface OrderLineDiscount {
  /** Catalog code: 01 regalía · 03 bonificación · 07 comercial · 99 otros. */
  discount_type_id?: string;
  percentage?: number | null;
  /** Required only for 99. */
  reason?: string | null;
  is_amount?: boolean | null;
  amount?: number | null;
}

/** One product code on a line, per Hacienda Nota 6. */
export interface OrderLineCode {
  /** 01 vendedor · 02 comprador · 03 fabricante · 04 uso interno · 99 otros. */
  code_type_id?: string;
  number?: string;
}

export interface OrderLine {
  line_number: number;
  /**
   * Catalog product this line came from. Sent on every manual order
   * (`ManualOrderLinePayload`); the BE echoes it back so a later invoice can
   * resolve the line to the real product — with its CABYS, taxes and
   * discounts — instead of guessing from the description.
   */
  product_id?: string;
  /** CABYS code captured with the line, when it had one. */
  cabys?: string;
  internal_code: string;
  code: string;
  client_article_code: string;
  description: string;
  units_per_box: number;
  quantity_ordered: number;
  units_ordered: number;
  unit_price: number;
  discount: number;
  line_total: number;
  tax: number;
  /** Unit price before tax. */
  net_price?: number | null;
  /**
   * Structured per-line breakdowns. Present on BOTH sides of the Orders
   * module: a POS-captured line sends them, and an Excel-imported line gets
   * them filled in server-side — the discount as `07 Descuento Comercial`
   * (the spreadsheet carries an amount but no type) and the taxes copied from
   * the product. That is what makes either kind of order billable later
   * without inventing a rate.
   */
  taxes?: OrderLineTax[] | null;
  discounts?: OrderLineDiscount[] | null;
  /**
   * The LINE's own product codes, canonical `[{code_type_id, number}]`.
   *
   * Not the product's. A chain assigns its own buyer article code, and the
   * catalog product's `codes` array holds only whatever the most recent import
   * wrote — so two customers ordering the same product overwrite each other
   * there. `internal_code` / `code` / `client_article_code` above are the same
   * data flattened for display, with the product as a fallback for rows written
   * before the line had its own column.
   */
  codes?: OrderLineCode[] | null;
  /** Hacienda `UnidadMedida` — required on every document line. */
  unit_measure?: string | null;
  commercial_unit_measure?: string | null;
  customs_part?: string | null;
  /**
   * Editable taxable base. Legal only alongside tax code 07 (IVA cálculo
   * especial) or `iva_collected_factory === "01"`; rejected anywhere else.
   */
  base_amount?: number | null;
  /** `IVACobradoFabrica`: "01" settled at factory, "02" exempt by regime. */
  iva_collected_factory?: string | null;
  quantity_dispatched: number;
  dispatch_rejection_reason: string | null;
  quantity_received: number;
  article_code: string;
}

export interface OrderTotals {
  total_lines: number;
  total_quantity_ordered: number;
  total_units_ordered: number;
  total_quantity_dispatched: number;
  total_quantity_received: number;
  subtotal: number;
  net_total: number;
  grand_total: number;
}

// ─── Cross-docking (order_type === '73') ────────────────────────────────────

export interface CrossdockingSalePointItem {
  internal_code: string;
  original_code: string;
  description: string;
  units_per_box: number;
  quantity: number;
  total_units: number;
  sent: number;
  missing: number;
}

export interface CrossdockingSalePoint {
  store_number: string;
  store_name: string;
  full_name: string;
  slot_id?: string | null;
  items: CrossdockingSalePointItem[];
  total_boxes: number;
  total_units: number;
}

export interface CrossdockingItemSummary {
  internal_code: string;
  original_code: string;
  description: string;
  units_per_box: number;
  total_boxes: number;
  total_units: number;
}

export interface CrossdockingBoxSummary {
  items_per_box: number;
  box_count: number;
  total_boxes: number;
  total_units: number;
}

export interface CrossdockingTotals {
  total_boxes: number;
  total_units: number;
  total_line_items: number;
  total_sale_points: number;
}

export interface CrossdockingAttachments {
  pdf_url?: string;
  excel_url?: string;
}

export interface Crossdocking {
  attachments?: CrossdockingAttachments | null;
  sale_points: CrossdockingSalePoint[];
  item_summary: CrossdockingItemSummary[];
  box_summary: CrossdockingBoxSummary[];
  totals: CrossdockingTotals;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface Order {
  order_id: number;
  company_id: string;
  document_number: string;
  document_type: string;
  /** `'73'` indicates a cross-docking order (enables the crossdocking flow). */
  order_type: string;
  creation_date: string;
  delivery_date: string;
  order_status: OrderStatus;
  client: OrderParty;
  supplier: OrderParty;
  delivery_location: DeliveryLocation;
  event: string;
  department: string | OrderDepartment | null;
  comment: string;
  line_count: number;
  total_quantities: number;
  subtotal: number;
  discounts: number;
  net_total: number;
  taxes: number;
  grand_total: number;
  /** BGM/011 reference document number (nullable). */
  bgm011: string | null;
  confirmation_id?: number | null;
  confirmation_number?: string | null;
  /** Report colour scheme applied during reprocess. */
  report_color?: ReportColorScheme;
  attachments: OrderAttachments;
  lines: OrderLine[];
  order_totals: OrderTotals;
  /** Present only after a cross-docking upload on a type-`73` order. */
  crossdocking?: Crossdocking | null;

  // ── Manual orders ─────────────────────────────────────────────────────────
  /** `'manual'` for orders captured in the POS; absent/`'import'` otherwise. */
  source?: string;
  /** Catalog client, when the order was captured with one selected. */
  client_id?: string | null;
  /**
   * Currency the order was priced in. Billing it has to reuse the SAME
   * currency and rate — re-quoting a delivered order at today's rate changes
   * what the customer owes.
   */
  currency_code?: string | null;
  exchange_rate?: number | null;
  /**
   * Identifier of the document that billed this order, once linked. Present on
   * ANY order, not just manual ones — a pedido is not always invoiced, and this
   * is what records that it finally was.
   *
   * Written asynchronously, when Hacienda accepts the document: there is a
   * window after checkout in which the document exists and this is still empty.
   */
  document_id?: string | null;
  /** That document, reduced to what the order needs to show. */
  document_info?: OrderDocumentInfo | null;
}

/**
 * The order a document is being issued for, as it travels ON the document.
 *
 * This is what lets the validator link the two records after Hacienda rules,
 * and it is why the link no longer has to be a synchronous call from the
 * checkout. It rides the document's coded free-text block under OUR codes
 * (`TsuruNumeroPedido` / `TsuruOrigenPedido`) — see `orderOtherFields` in
 * `hooks/useCartFlow`. A chain's `WMNumeroOrden` carries the same number for a
 * chain order, but that code belongs to the chain and is not emitted for
 * anyone else.
 */
export interface OrderReference {
  /** The order's own document number — `PM-000123`, or the chain's PO number. */
  document_number?: string;
  /** `manual` | `import` | `storefront`. Tells a pedido from a chain order. */
  source?: string;
}

/**
 * The electronic document that billed an order, as the order carries it.
 *
 * Written by store-be when sales-be reports that Hacienda ACCEPTED the
 * document — not at checkout time. So it is absent while a document is still
 * being validated, and absent forever for one that was rejected, which is the
 * point: an order billed by a rejected document is still billable.
 */
export interface OrderDocumentInfo {
  /** The sale UUID — the id `/dashboard/documents/:saleId` takes. */
  document_id?: string;
  /** The internal document number (bigint). Display only. */
  document_number?: number;
  /** Hacienda document type ("01" FE, "04" TE, …). */
  document_type?: string;
  consecutive_number?: string;
  document_key?: string;
  issued_on?: string;
  /** Hacienda verdict: 1 ACCEPTED, 2 PARTIAL, 3 REJECTED. */
  status?: number;
  total_amount?: number;
  currency_code?: string;
}

// ─── Pagination + list envelope ──────────────────────────────────────────────

export interface OrdersPagination {
  page: number;
  page_size: number;
  total_elements: number;
  total_pages: number;
}

export interface OrdersListResult {
  data: Order[];
  pagination: OrdersPagination;
}

// ─── Manual orders (pedidos manuales) ───────────────────────────────────────
/**
 * Orders captured by hand in the POS document editor instead of arriving via
 * the B2B Excel import. They exist for organizations that do not issue
 * Hacienda electronic documents (see `useFiscalMode`): the cart, the
 * line-detail drawer and the checkout drawer are reused verbatim, and only the
 * persistence target changes — orders API, no XML, no signature, no ATV.
 *
 * Wire contract: `docs/MANUAL_ORDERS.md`.
 */

/** Discriminator persisted on the order so the BE and the UI can tell them apart. */
export const MANUAL_ORDER_SOURCE = 'manual' as const;

/**
 * Where a manual order gets delivered. Three modes, one shape — so everything
 * downstream reads a single object instead of branching.
 *
 * There is deliberately NO free-text-only mode: a delivery address is either a
 * point the client has registered, the receiver's own address, or the
 * structured CR cascade. A typed-in blob is unusable for routing and cannot be
 * reused on the next order.
 */
export type DeliveryLocationMode = 'store' | 'receiver' | 'custom';

export interface ManualOrderDeliveryLocation {
  mode: DeliveryLocationMode;
  /** `store` mode: the client's registered store/point-of-sale. */
  store_id?: string;
  /** Denormalized from the store, or the label of the chosen address. */
  code?: string;
  name?: string;
  gln?: string;
  /** `receiver` / `custom` modes: the CR location cascade + exact address. */
  state_id?: number | null;
  county_id?: number | null;
  district_id?: number | null;
  neighborhood_id?: number | null;
  address?: string | null;
}

/** Extra fields the checkout collects for a manual order. */
export interface ManualOrderFields {
  /**
   * Save as a cotización instead of a firm pedido. A proforma is an order in
   * an early status (`quote`), never a separate document type.
   */
  is_quote?: boolean;
  /** User-writable order number. Empty means the server assigns one. */
  document_number?: string;
  /** Hacienda sale condition — moved here from the Documento card. */
  sale_condition?: string;
  /** Org's registered economic activity — moved here from the Documento card. */
  activity_code?: string;
  credit_term?: string;
  /** Document currency — moved here from the Documento card. */
  currency_code?: string;
  exchange_rate?: number;
  /** ISO date (`YYYY-MM-DD`). */
  delivery_date?: string;
  /** B2B: the client's purchasing department (supplier orgs only). */
  department_id?: string;
  department_code?: string;
  /** Where it goes — see {@link ManualOrderDeliveryLocation}. */
  delivery_location?: ManualOrderDeliveryLocation;
  /** Free-text note carried into `Order.comment`. Absorbs the old Documento notes. */
  comment?: string;
}

export interface ManualOrderLinePayload {
  line_number: number;
  /** Catalog product when the line came from the product grid. */
  product_id?: string;
  internal_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  /** Absolute discount amount for the line (already cascaded). */
  discount: number;
  /** Absolute tax amount for the line. */
  tax: number;
  line_total: number;
  /** Kept even though the order is not fiscal: it makes a later FE trivial. */
  cabys?: string;
  /**
   * The line's structured fiscal treatment, in the SAME shape a sale's
   * `details[]` carries.
   *
   * A pedido is not a fiscal document, but the invoice built from it later is,
   * and it has to charge what the customer agreed to. Without these the order
   * kept only flat amounts and billing it had to re-derive the tax from the
   * catalog at invoice time — re-pricing a delivered sale at today's terms, and
   * silently dropping any excise the line carried, since a per-unit amount
   * cannot be recovered from a total.
   */
  taxes?: ManualOrderLineTaxPayload[];
  discounts?: ManualOrderLineDiscountPayload[];
  /** The line's own product codes — see {@link OrderLineCode}. */
  codes?: OrderLineCode[];
  /**
   * Hacienda `UnidadMedida`. Required on every document line, so a pedido that
   * omits it forces a fallback to "Unid" when it is billed — wrong for anything
   * sold by weight or volume.
   */
  unit_measure?: string;
  commercial_unit_measure?: string;
  customs_part?: string;
  /** Editable taxable base — tax code 07 or `iva_collected_factory` "01" only. */
  base_amount?: number;
  /** `IVACobradoFabrica`: "01" settled at factory, "02" exempt by regime. */
  iva_collected_factory?: string;
}

/** One tax on a manual-order line. Mirrors the document's `LineTax`. */
export interface ManualOrderLineTaxPayload {
  /** Hacienda tax type code. */
  code: string;
  rate?: number;
  rate_code?: string;
  /**
   * IVARBU (code 08) multiplier — `tax = subtotal × factor`.
   *
   * store-be has always accepted it (`ManualOrderTaxDTO.factor`) and persisted
   * it as `tax_factor`; this side simply never sent it, so a POS-captured
   * used-goods line arrived with no factor and the pedido could not be billed
   * (`tax.factor is required when tax.code=08`).
   */
  factor?: number;
  /** Required when code = "99" (Otros). */
  other_tax_type?: string;
  /** Per-unit parameters for the specific excises (03/04/05/06/12). */
  special_fields?: {
    quantity?: number;
    percentage?: number;
    proportion?: number;
    volume_consumption?: number;
    tax_amount_id?: number | string;
    tax_unit_amount?: number;
  };
}

/** One discount on a manual-order line, in Nota 20 cascade order. */
export interface ManualOrderLineDiscountPayload {
  /** Hacienda discount nature code. */
  code: string;
  percentage?: number;
  amount?: number;
  /** Nota 20 free text — required for code 99. */
  nature?: string;
}

export interface ManualOrderTotalsPayload {
  total_lines: number;
  total_quantity_ordered: number;
  subtotal: number;
  discounts: number;
  taxes: number;
  grand_total: number;
}

export interface ManualOrderPayload {
  /** Always `'manual'` — lets the BE keep imported and hand-made orders apart. */
  source: typeof MANUAL_ORDER_SOURCE;
  /** Internal editor doc type (`'PM'`), never a Hacienda code. */
  document_type: string;
  /** `'work_order'` for a taller OT; omitted for a plain pedido. */
  order_type?: string;
  /** User-supplied order number; omit to let the server assign one. */
  document_number?: string;
  /** True when saved as a proforma — the BE opens it in `quote` status. */
  is_quote?: boolean;
  /** Captured so a later factura reuses what the cashier chose. */
  sale_condition?: string;
  activity_code?: string;
  credit_term?: string;
  /** Catalog client when one was selected in the POS. */
  client_id?: string | null;
  client: OrderParty;
  delivery_date?: string;
  delivery_location?: ManualOrderDeliveryLocation;
  /**
   * The vendor number the chain assigns to us, taken from the selected
   * department.
   *
   * Sent so store-be maps it the way the Excel import does — it BACKFILLS a
   * department that has none and never overwrites one that does. Not typed
   * anywhere: the department is where it is maintained.
   */
  supplier_code?: string;
  /** B2B department of the client (supplier orgs). */
  department_id?: string;
  /** Taller: the client asset (vehicle/equipment) the OT is about. */
  asset_id?: string;
  odometer?: number;
  reported_issue?: string;
  event?: string;
  comment?: string;
  currency_code: string;
  exchange_rate: number;
  /** Session context, when the order was captured from a POS terminal. */
  assignment_id?: string;
  branch_number?: number;
  terminal_number?: number;
  /** Payment methods recorded at capture time; may be empty for an open order. */
  payments: { type: string; other_type?: string; amount: number }[];
  lines: ManualOrderLinePayload[];
  totals: ManualOrderTotalsPayload;
}


/**
 * Extra data a retail chain requires on the documents issued to it.
 *
 * Which chain (if any) is decided from the CLIENT's identification number —
 * see `lib/chainClients`. The fields below are what Walmart asks for; a chain
 * added later can reuse the ones it shares and ignore the rest, since each
 * chain gets its own card.
 *
 * This lives at the checkout level rather than inside {@link ManualOrderFields}
 * because it is needed on an ELECTRONIC INVOICE too, not only on a manual
 * order — which is why the fields were moved out of the pedido card.
 */
export interface ChainClientInfo {
  /** The chain's purchasing department. */
  department_id?: string;
  department_code?: string;
  /**
   * The supplier number the chain assigns to US, held on the department.
   *
   * Walmart calls it the vendor number and requires it on the document as
   * `WMNumeroVendedor`. It was captured on the department already (and shown on
   * the department card) but never travelled to a document, so every invoice to
   * the chain went out missing a field it demands. Derived from the selected
   * department rather than typed, because that is where it is maintained.
   */
  supplier_code?: string;
  /** Registered delivery point (tienda / bodega). */
  store_id?: string;
  store_code?: string;
  store_name?: string;
  /** GS1 Global Location Number of the delivery point. */
  gln?: string;
  /** The chain's own purchase-order number — theirs, not ours. */
  purchase_order_number?: string;
}

/**
 * Statuses in which an order's delivery date may still be moved.
 *
 * Mirrors store-be's `DELIVERY_DATE_EDITABLE_STATUSES`. An order still being
 * prepared can be rescheduled; once it has SHIPPED the date has been acted on and
 * the customer told, delivered and cancelled are history, and a quote is not a
 * placed order yet.
 */
export const DELIVERY_DATE_EDITABLE_STATUSES: readonly OrderStatus[] = [
  'pending',
  'processing',
] as const;

/**
 * Whether the UI should offer to change this order's delivery date.
 *
 * The backend enforces the same three conditions and answers 400 otherwise; this
 * exists so the action is not offered when it cannot succeed, not as the check.
 */
export function canEditDeliveryDate(
  order: Pick<Order, 'order_status' | 'document_id'>,
): boolean {
  if (order.document_id) return false;   // billed: the date is on the document
  return DELIVERY_DATE_EDITABLE_STATUSES.includes(order.order_status);
}
