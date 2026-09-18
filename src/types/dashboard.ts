/**
 * Dashboard wire types.
 *
 * One type per panel endpoint. The single `DashboardData` payload that used to
 * live here is gone with its last caller: it was the shape that reported zeros
 * for an organization with real orders, because everything in it was gated on a
 * cashier having a till open, and its `emoji` / `cash` / `sinpe` / `card` fields
 * were never populated by the API at all.
 */

/** `GET /dashboard/sales-summary` — the whole organization, not one till. */
export interface DashboardSalesSummary {
  orders: number;
  revenue: number;
  average_ticket: number;
  units: number;
  last_order_at: string | null;
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
}

export interface DashboardTrendPoint {
  day: string | null;
  orders: number;
  revenue: number;
}

/** `GET /dashboard/sales-trend` */
export interface DashboardSalesTrend {
  days: DashboardTrendPoint[];
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
