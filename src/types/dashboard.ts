/**
 * Dashboard wire types.
 *
 * One type per panel endpoint. The single `DashboardData` payload that used to
 * live here is gone with its last caller: it was the shape that reported zeros
 * for an organization with real orders, because everything in it was gated on a
 * cashier having a till open, and its `emoji` / `cash` / `sinpe` / `card` fields
 * were never populated by the API at all.
 */

/** Which population the dashboard is counting. */
export type DashboardSource = "orders" | "documents";

/** Buckets the trend endpoint accepts. */
export type DashboardGranularity = "hour" | "day" | "week" | "month" | "year";

/**
 * What slice the SERVER answered for — not what the client asked.
 *
 * A non-admin asking for a whole session is narrowed to their own rows, so the
 * response has to say which it is or the UI will label one as the other.
 */
export interface DashboardScopeInfo {
  scope: "organization" | "session" | "session_user";
  session_id: string | null;
  user_id: string | null;
  is_admin: boolean;
}

/** `GET /dashboard/sales-summary` — the whole organization, not one till. */
export interface DashboardSalesSummary {
  orders: number;
  revenue: number;
  average_ticket: number;
  units: number;
  last_order_at: string | null;
  scope?: DashboardScopeInfo | null;
}

export interface DashboardStatusCount {
  status: string;
  orders: number;
  value: number;
  /** Whether this status means the order is still in flight. */
  is_open: boolean;
}

/** `GET /dashboard/order-status` — what is still in process. */
export interface DashboardOrderStatus {
  statuses: DashboardStatusCount[];
  open_orders: number;
  open_value: number;
  /** Documents only: refused by Hacienda, excluded from revenue but shown here. */
  rejected_orders?: number;
  rejected_value?: number;
  scope?: DashboardScopeInfo | null;
}

export interface DashboardTopProduct {
  product_id: string | null;
  name: string;
  image_url: string;
  units: number;
  revenue: number;
}

/** `GET /dashboard/top-products` */
export interface DashboardTopProducts {
  products: DashboardTopProduct[];
  scope?: DashboardScopeInfo | null;
}

export interface DashboardTrendPoint {
  /** Bucket start, ISO 8601, with a time component at every granularity. */
  bucket: string | null;
  orders: number;
  revenue: number;
}

/**
 * `GET /dashboard/sales-trend`
 *
 * Buckets with no sales are ABSENT rather than zero — a missing bucket and a zero
 * bucket are different facts. `granularity` is echoed so the chart labels its axis
 * from what it received rather than from what it asked for.
 */
export interface DashboardSalesTrend {
  granularity: DashboardGranularity;
  date_from: string | null;
  date_to: string | null;
  points: DashboardTrendPoint[];
  scope?: DashboardScopeInfo | null;
}

/** `GET /dashboard/session-sales` — open orders plus today's deliveries. */
export interface DashboardSessionSales {
  orders: number;
  revenue: number;
  average_ticket: number;
  /**
   * Which rule decided whether a DELIVERED order counted.
   * `created_today` while `delivery_date` is still a two-format string that
   * cannot be compared safely; `delivery_date_today` once it is a real date.
   */
  delivered_rule: string;
  scope?: DashboardScopeInfo | null;
}

export interface DashboardStation {
  assignment_id: string;
  branch_id: string | null;
  user_id: string | null;
  session_id: string;
  session_name: string;
  session_context: string;
  started_at: string | null;
  orders: number;
  revenue: number;
  last_order_at: string | null;
}

/** `GET /dashboard/stations` — who is on a till right now. */
export interface DashboardStations {
  stations: DashboardStation[];
  active_sessions: number;
}
