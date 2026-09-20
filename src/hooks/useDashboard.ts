import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath, documentsOrgPath, salesApi } from "@/lib/api";
import type {
  DashboardGranularity,
  DashboardOrderStatus,
  DashboardSalesSummary,
  DashboardSalesTrend,
  DashboardSessionSales,
  DashboardSource,
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
 * ticket. Splitting the calls splits the failure modes too.
 *
 * **Two sources, two services.** Orders come from store-be, documents from
 * sales-be, because each owns its own table — an order may never be billed and a
 * document may have no order behind it, so they are genuinely different counts.
 * Both answer in the same shape, so a panel does not care which it got.
 *
 * Refresh rates differ on purpose: money and open tills move minute to minute, a
 * product ranking and a two-week trend do not.
 */

const LIVE_REFRESH_MS = 30_000;
const SLOW_REFRESH_MS = 5 * 60_000;

/** Scope and window, as the panels take them. */
export interface DashboardQueryOptions {
  source?: DashboardSource;
  sessionId?: string;
  /** Narrow to one person. A non-admin is narrowed server-side regardless. */
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * The window as the DOCUMENTS endpoints take it — `DocumentSearchDTO` JSON.
 *
 * Same contract as `GET /sales`, so the chart's filter and the list's filter are
 * the one thing. `useSales.toWireSearch` builds the same blob for the list.
 *
 * Returns undefined with no window, so `queryString` drops the parameter rather
 * than sending `search={}`.
 */
function documentSearch(options: DashboardQueryOptions): string | undefined {
  if (!options.dateFrom && !options.dateTo) return undefined;
  const search: Record<string, string> = {};
  if (options.dateFrom) search.start_date = options.dateFrom;
  if (options.dateTo) search.end_date = options.dateTo;
  // Encoded here and again by URLSearchParams; the backend's Query() decodes
  // once. Same double-encode the documents list does — deliberately identical,
  // because the two are read by the same parser.
  return encodeURIComponent(JSON.stringify(search));
}

/**
 * Where a panel lives, per source. The two services expose the same shapes under
 * different paths, so this is the only place that has to know which is which.
 */
function endpoint(
  source: DashboardSource,
  orgId: string,
  panel: "summary" | "status" | "top-products" | "trend",
  query: string,
) {
  if (source === "documents") {
    return {
      client: salesApi,
      path: documentsOrgPath(orgId, `/${panel}${query}`),
    };
  }
  const orders = {
    summary: "sales-summary",
    status: "order-status",
    "top-products": "top-products",
    trend: "sales-trend",
  }[panel];
  return {
    client: crossAppApi,
    path: crossAppOrgPath(orgId, `/dashboard/${orders}${query}`),
  };
}

/** Scope keys go in every query key, or switching scope would show stale data. */
function scopeKey(options: DashboardQueryOptions) {
  return [
    options.source ?? "orders",
    options.sessionId ?? null,
    options.userId ?? null,
    options.dateFrom ?? null,
    options.dateTo ?? null,
  ];
}

/** Revenue, count and average value for the chosen source and scope. */
export function useSalesSummary(
  orgId: string | undefined,
  options: DashboardQueryOptions = {},
  enabled = true,
) {
  const source = options.source ?? "orders";
  return useQuery({
    queryKey: ["dashboard", "summary", orgId, ...scopeKey(options)],
    enabled: !!orgId && enabled,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: () => {
      const query = queryString({
        session_id: options.sessionId,
        user_id: options.userId,
        date_from: options.dateFrom,
        date_to: options.dateTo,
      });
      const { client, path } = endpoint(source, orgId!, "summary", query);
      return client.get<DashboardSalesSummary>(path);
    },
  });
}

/**
 * Orders per status, or documents per Hacienda verdict.
 *
 * The document side is where rejections show up: they are excluded from revenue
 * but counted here, because "39 rejected" is what an operator acts on.
 */
export function useOrderStatus(
  orgId: string | undefined,
  options: DashboardQueryOptions = {},
  enabled = true,
) {
  const source = options.source ?? "orders";
  return useQuery({
    queryKey: ["dashboard", "status", orgId, ...scopeKey(options)],
    enabled: !!orgId && enabled,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: () => {
      const query = queryString({
        session_id: options.sessionId,
        user_id: options.userId,
      });
      const { client, path } = endpoint(source, orgId!, "status", query);
      return client.get<DashboardOrderStatus>(path);
    },
  });
}

/** Best sellers. Slow-moving, so it does not need the live interval. */
export function useTopProducts(
  orgId: string | undefined,
  limit = 10,
  options: DashboardQueryOptions = {},
) {
  const source = options.source ?? "orders";
  return useQuery({
    queryKey: ["dashboard", "top-products", orgId, limit, ...scopeKey(options)],
    enabled: !!orgId,
    refetchInterval: SLOW_REFRESH_MS,
    queryFn: () => {
      const query = queryString({
        limit,
        session_id: options.sessionId,
        user_id: options.userId,
      });
      const { client, path } = endpoint(source, orgId!, "top-products", query);
      return client.get<DashboardTopProducts>(path);
    },
  });
}

/**
 * Revenue per bucket for the chart.
 *
 * `granularity` and the window are the server's business — it buckets with
 * `date_trunc` and echoes back what it answered for, so the chart can label its
 * axis from the response rather than from what it asked.
 */
export function useSalesTrend(
  orgId: string | undefined,
  granularity: DashboardGranularity = "day",
  options: DashboardQueryOptions = {},
) {
  const source = options.source ?? "orders";
  return useQuery({
    queryKey: ["dashboard", "trend", orgId, granularity, ...scopeKey(options)],
    enabled: !!orgId,
    refetchInterval: SLOW_REFRESH_MS,
    queryFn: () => {
      // The two sources take the window differently, and neither is wrong: the
      // documents trend takes the DOCUMENTS-LIST filter (`search`, a URL-encoded
      // JSON blob) so the chart and the documents list cannot disagree about the
      // same filter; the orders trend has its own flat `date_from`/`date_to`.
      const query =
        source === "documents"
          ? queryString({
              granularity,
              search: documentSearch(options),
            })
          : queryString({
              granularity,
              date_from: options.dateFrom,
              date_to: options.dateTo,
              session_id: options.sessionId,
              user_id: options.userId,
            });
      const { client, path } = endpoint(source, orgId!, "trend", query);
      return client.get<DashboardSalesTrend>(path);
    },
  });
}

/**
 * "Ventas de la sesión" — pending, processing and shipped, plus deliveries from
 * today. Orders only: a document has no delivery to be pending.
 */
export function useSessionSales(
  orgId: string | undefined,
  options: DashboardQueryOptions = {},
) {
  return useQuery({
    queryKey: ["dashboard", "session-sales", orgId, options.sessionId ?? null, options.userId ?? null],
    enabled: !!orgId,
    refetchInterval: LIVE_REFRESH_MS,
    queryFn: () =>
      crossAppApi.get<DashboardSessionSales>(
        crossAppOrgPath(
          orgId!,
          `/dashboard/session-sales${queryString({
            session_id: options.sessionId,
            user_id: options.userId,
          })}`,
        ),
      ),
  });
}

/**
 * Tills currently open, optionally for one session. Empty means nobody is
 * working — a real answer, and no longer one that takes the sales figures with
 * it.
 *
 * Lives on the session drawer rather than the dashboard: "who is on a till" is a
 * question about a session, and it was the reason the whole dashboard used to
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
