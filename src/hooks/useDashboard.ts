import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import type {
  DashboardOrderStatus,
  DashboardSalesSummary,
  DashboardSalesTrend,
  DashboardStations,
  DashboardTopProducts,
} from "@/types/dashboard";

/**
 * One hook per dashboard panel, because each panel is a separate question.
 *
 * The dashboard used to be a single `/dashboard` call, and that coupling was the
 * bug: the sales figures were derived by walking active session → active
 * assignment → that assignment's orders, so an organization with 45 real orders
 * and nobody on a till reported zero revenue, zero orders and a zero average
 * ticket. Splitting the calls splits the failure modes too — the "who is
 * working" panel being empty no longer blanks the revenue beside it.
 *
 * Refresh rates differ on purpose: money and open tills move minute to minute,
 * a product ranking and a two-week trend do not.
 */

const LIVE_REFRESH_MS = 30_000;
const SLOW_REFRESH_MS = 5 * 60_000;

/** Revenue, order count and average ticket for the whole organization. */
export function useSalesSummary(orgId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "sales-summary", orgId],
    enabled: !!orgId && enabled,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: () =>
      crossAppApi.get<DashboardSalesSummary>(
        crossAppOrgPath(orgId!, "/dashboard/sales-summary"),
      ),
  });
}

/** Orders per status — the panel that answers "what is still in process". */
export function useOrderStatus(orgId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "order-status", orgId],
    enabled: !!orgId && enabled,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: () =>
      crossAppApi.get<DashboardOrderStatus>(
        crossAppOrgPath(orgId!, "/dashboard/order-status"),
      ),
  });
}

/** Best sellers. Slow-moving, so it does not need the live interval. */
export function useTopProducts(orgId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ["dashboard", "top-products", orgId, limit],
    enabled: !!orgId,
    refetchInterval: SLOW_REFRESH_MS,
    queryFn: () =>
      crossAppApi.get<DashboardTopProducts>(
        crossAppOrgPath(orgId!, `/dashboard/top-products?limit=${limit}`),
      ),
  });
}

/** Daily revenue for the chart. */
export function useSalesTrend(orgId: string | undefined, days = 14) {
  return useQuery({
    queryKey: ["dashboard", "sales-trend", orgId, days],
    enabled: !!orgId,
    refetchInterval: SLOW_REFRESH_MS,
    queryFn: () =>
      crossAppApi.get<DashboardSalesTrend>(
        crossAppOrgPath(orgId!, `/dashboard/sales-trend?days=${days}`),
      ),
  });
}

/**
 * Tills currently open, optionally for one session. Empty means nobody is
 * working — a real answer, and no longer one that takes the sales figures with
 * it.
 *
 * Lives on the session drawer rather than the dashboard: "who is on a till" is
 * a question about a session, and it was the reason the whole dashboard used to
 * read zero. Note the endpoint only returns tills whose session AND assignment
 * are still open, so a CLOSED session returns nothing — its money is in
 * `closings`, not here.
 */
export function useStations(orgId: string | undefined, sessionId?: string) {
  return useQuery({
    queryKey: ["dashboard", "stations", orgId, sessionId ?? null],
    enabled: !!orgId,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: () =>
      crossAppApi.get<DashboardStations>(
        crossAppOrgPath(
          orgId!,
          `/dashboard/stations${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
        ),
      ),
  });
}
