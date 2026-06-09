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
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Numeric status map the BE expects for status PATCH bodies. */
export const ORDER_STATUS_CODES: Record<OrderStatus, number> = {
  pending: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
};

// ─── Report colour schemes ─────────────────────────────────────────────────
// The hex literals live ONLY in this data object (REPORT_COLOR_OPTIONS) and are
// consumed via data-driven inline `style={{ background }}` — the legit §3.6
// exception. Do NOT scatter these hexes into classNames.

export type ReportColorScheme = 'green' | 'orange' | 'blue' | 'green_alt';

export interface ReportColorOption {
  value: ReportColorScheme;
  /** i18n key for the label, e.g. `orders.colorScheme.green` (resolve via t()). */
  label: string;
  /** Data-driven hex — rendered only via inline style (CLAUDE.md §3.6). */
  hex: string;
}

export const REPORT_COLOR_OPTIONS: ReportColorOption[] = [
  { value: 'green', label: 'orders.colorScheme.green', hex: '#0e5c23' },
  { value: 'orange', label: 'orders.colorScheme.orange', hex: '#c65811' },
  { value: 'blue', label: 'orders.colorScheme.blue', hex: '#1e4e77' },
  { value: 'green_alt', label: 'orders.colorScheme.green_alt', hex: '#375522' },
];

// ─── Sub-types matching backend DTOs ────────────────────────────────────────

export interface OrderParty {
  name: string;
  gln: string;
  internal_code: string;
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
}

export interface OrderLine {
  line_number: number;
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
  code: string;
  description: string;
  units_per_box: number;
  boxes: number;
  units: number;
  total_units: number;
}

export interface CrossdockingSalePoint {
  store_code: string;
  store_name: string;
  gln: string;
  items: CrossdockingSalePointItem[];
  total_boxes: number;
  total_units: number;
}

export interface CrossdockingItemSummary {
  internal_code: string;
  code: string;
  description: string;
  units_per_box: number;
  total_boxes: number;
  total_units: number;
}

export interface CrossdockingBoxSummary {
  store_code: string;
  store_name: string;
  total_boxes: number;
}

export interface CrossdockingTotals {
  total_boxes: number;
  total_units: number;
  total_items: number;
  total_sale_points: number;
}

export interface CrossdockingAttachments {
  pdf_url?: string;
  excel_url?: string;
}

export interface Crossdocking {
  attachments: CrossdockingAttachments;
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
  department: string;
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
  /** Report colour scheme applied during reprocess. */
  report_color?: ReportColorScheme;
  attachments: OrderAttachments;
  lines: OrderLine[];
  order_totals: OrderTotals;
  /** Present only after a cross-docking upload on a type-`73` order. */
  crossdocking?: Crossdocking | null;
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
