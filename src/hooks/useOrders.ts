import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersStoreApi, ordersStoreOrgPath } from '@/lib/api';
import {
  ORDER_STATUS_CODES,
  type Order,
  type OrderStatus,
  type OrdersListResult,
  type OrdersPagination,
  type ReportColorScheme,
} from '@/types/order';
import {
  buildOrderSearchString,
  type OrderSearchFilters,
} from '@/lib/orderSearchBuilder';
import { fileToBase64, XLSX_MIME } from '@/lib/downloadUtils';

/**
 * STORE / MARKETPLACE ORDERS — distinct from POS electronic invoices (sales).
 *
 * Orders come from the `cross-app-be` (orders) API at
 *   GET   /api/organizations/{orgId}/orders               (paginated list)
 *   GET   /api/organizations/{orgId}/orders/{docNum}       (single order)
 *   PATCH /api/organizations/{orgId}/orders/{docNum}       (status update)
 *   POST  /api/organizations/{orgId}/orders/parse          (Excel import)
 *   POST  /api/organizations/{orgId}/orders/{docNum}/reprocess
 *   POST  /api/organizations/{orgId}/orders/{docNum}/crossdocking/parse
 *
 * The list response mirrors the cross-app-be paginated envelope
 * (`{ data, pagination }`). Pagination keys may arrive snake_case or camelCase
 * (dashboard build) — both normalized in {@link normalizePagination}.
 */

// ─── Type re-exports (single source of truth lives in src/types/order.ts) ────

export {
  ORDER_STATUSES,
  ORDER_STATUS_CODES,
  REPORT_COLOR_OPTIONS,
} from '@/types/order';
export type {
  Order,
  OrderStatus,
  OrderLine,
  OrderParty,
  OrderTotals,
  OrderAttachments,
  DeliveryLocation,
  OrdersPagination,
  OrdersListResult,
  ReportColorScheme,
  Crossdocking,
  CrossdockingSalePoint,
  CrossdockingSalePointItem,
  CrossdockingItemSummary,
  CrossdockingBoxSummary,
  CrossdockingTotals,
} from '@/types/order';

// ─── Raw wire shapes ─────────────────────────────────────────────────────────

interface RawPagination {
  page?: number;
  page_size?: number;
  pageSize?: number;
  total_elements?: number;
  totalElements?: number;
  total_pages?: number;
  totalPages?: number;
}

interface RawOrdersResponse {
  data?: Order[];
  pagination?: RawPagination;
}

function normalizePagination(
  raw: RawPagination | undefined,
  fallbackPage: number,
  fallbackSize: number,
): OrdersPagination {
  return {
    page: raw?.page ?? fallbackPage,
    page_size: raw?.page_size ?? raw?.pageSize ?? fallbackSize,
    total_elements: raw?.total_elements ?? raw?.totalElements ?? 0,
    total_pages: raw?.total_pages ?? raw?.totalPages ?? 1,
  };
}

// ─── List query ──────────────────────────────────────────────────────────────

export interface UseOrdersParams {
  orgId: string | undefined;
  /**
   * Pre-built compound `search` string (from {@link buildOrderSearchString} or
   * the confirmation picker builders). When provided it is sent verbatim and
   * the structured `filters` field is ignored.
   */
  search?: string;
  /**
   * Structured filters — the hook builds the compound `search` string from them
   * via {@link buildOrderSearchString}. Use this for the Orders page.
   */
  filters?: OrderSearchFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useOrders({
  orgId,
  search,
  filters,
  page = 1,
  pageSize = 12,
  enabled = true,
}: UseOrdersParams) {
  // The current POS hook used to send flat `status/start_date/end_date` params;
  // switch to the dashboard's compound `search` string so multi-status, dual
  // date-range, and sort all flow to the BE.
  // TODO(verify-endpoint): confirm cross-app-be `/orders` consumes `search`.
  const searchString = useMemo(
    () => (search !== undefined ? search : filters ? buildOrderSearchString(filters) : ''),
    [search, filters],
  );

  const params = new URLSearchParams();
  if (searchString) params.set('search', searchString);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const queryString = params.toString();
  const path = ordersStoreOrgPath(orgId ?? '', `/orders${queryString ? `?${queryString}` : ''}`);

  return useQuery<OrdersListResult>({
    queryKey: ['orders', orgId, searchString, page, pageSize],
    enabled: enabled && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await ordersStoreApi.get<RawOrdersResponse>(path);
      return {
        data: res.data ?? [],
        pagination: normalizePagination(res.pagination, page, pageSize),
      };
    },
  });
}

// ─── Single-order query ──────────────────────────────────────────────────────
// NOTE: POS uses `orderId` as the route param name; its value IS the document
// number.

export function useOrder(orgId: string | undefined, orderId: string | undefined) {
  return useQuery<Order>({
    queryKey: ['order', orgId, orderId],
    enabled: !!orgId && !!orderId,
    queryFn: () => ordersStoreApi.get<Order>(ordersStoreOrgPath(orgId!, `/orders/${orderId}`)),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

/** Shared cache update: set the single-order cache + invalidate the list. */
function useOrderCacheSync(orgId: string | undefined, documentNumber: string) {
  const qc = useQueryClient();
  return (updated: Order) => {
    if (updated) qc.setQueryData(['order', orgId, documentNumber], updated);
    qc.invalidateQueries({ queryKey: ['orders'] });
  };
}

/**
 * Advance / cancel an order. Sends the numeric status code (§1 status map).
 * TODO(verify-endpoint): `OrderHeader` uses PATCH /orders/{doc} `{status}`
 * while the legacy detail page used PUT /orders/{doc}/status. Using PATCH.
 */
export function useUpdateOrderStatus(orgId: string | undefined, documentNumber: string) {
  const sync = useOrderCacheSync(orgId, documentNumber);
  return useMutation<Order, Error, OrderStatus>({
    mutationFn: (status) =>
      ordersStoreApi.patch<Order>(
        ordersStoreOrgPath(orgId!, `/orders/${documentNumber}`),
        { status: ORDER_STATUS_CODES[status] },
      ),
    onSuccess: (updated) => sync(updated),
  });
}

/** Reprocess an order with a report-color scheme. Returns the updated order. */
export function useReprocessOrder(orgId: string | undefined, documentNumber: string) {
  const sync = useOrderCacheSync(orgId, documentNumber);
  return useMutation<Order, Error, ReportColorScheme>({
    mutationFn: (color) =>
      // TODO(verify-endpoint): confirm POST /orders/{doc}/reprocess { color }.
      ordersStoreApi.post<Order>(
        ordersStoreOrgPath(orgId!, `/orders/${documentNumber}/reprocess`),
        { color },
      ),
    onSuccess: (updated) => sync(updated),
  });
}

/** Import orders from an Excel/CSV file (base64 upload). Invalidates the list. */
export function useUploadOrdersExcel(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, File>({
    mutationFn: async (file) => {
      const data = await fileToBase64(file);
      // TODO(verify-endpoint): confirm POST /orders/parse { data, name, contentType }.
      return ordersStoreApi.post(ordersStoreOrgPath(orgId!, '/orders/parse'), {
        data,
        name: file.name,
        contentType: file.type || XLSX_MIME,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

/** Upload a cross-docking Excel for a type-`73` order. Returns the updated order. */
export function useUploadCrossdocking(orgId: string | undefined, documentNumber: string) {
  const sync = useOrderCacheSync(orgId, documentNumber);
  return useMutation<Order, Error, { file: File; color: ReportColorScheme }>({
    mutationFn: async ({ file, color }) => {
      const data = await fileToBase64(file);
      // TODO(verify-endpoint): confirm POST /orders/{doc}/crossdocking/parse
      // { data, name, contentType, color }.
      return ordersStoreApi.post<Order>(
        ordersStoreOrgPath(orgId!, `/orders/${documentNumber}/crossdocking/parse`),
        { data, name: file.name, contentType: file.type || XLSX_MIME, color },
      );
    },
    onSuccess: (updated) => sync(updated),
  });
}

export default useOrders;
