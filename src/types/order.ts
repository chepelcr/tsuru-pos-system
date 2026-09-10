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

/** One tax on an order line — mirrors the product's stored tax shape. */
export interface OrderLineTax {
  tax_type_id?: string;
  tax_rate?: { id?: string; percentage?: number; code?: string } | null;
  tax_factor?: unknown;
  other_tax_type?: string | null;
  special_fields?: unknown;
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
   * Set once the order has been billed. Present on ANY order, not just manual
   * ones — a pedido is not always invoiced, and this is what records that it
   * finally was. Written by the BE when the sale is linked back
   * (`docs/MANUAL_ORDERS.md` §7).
   */
  invoice?: OrderInvoiceLink | null;
}

/** The electronic document that billed an order. */
export interface OrderInvoiceLink {
  sale_id?: string;
  /** Hacienda document type of the invoice ("01" FE, "04" TE, …). */
  document_type?: string;
  consecutive_number?: string;
  document_key?: string;
  issued_on?: string;
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
  /** Registered delivery point (tienda / bodega). */
  store_id?: string;
  store_code?: string;
  store_name?: string;
  /** GS1 Global Location Number of the delivery point. */
  gln?: string;
  /** The chain's own purchase-order number — theirs, not ours. */
  purchase_order_number?: string;
}
