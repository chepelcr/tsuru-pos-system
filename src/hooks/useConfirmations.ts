import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersStoreApi, ordersStoreOrgPath } from '@/lib/api';
import { ORDER_STATUS_CODES, type OrderStatus } from '@/types/order';
import type {
  Confirmation,
  ConfirmationsListResult,
  ConfirmationsPagination,
  CreateConfirmationDto,
  UpdateConfirmationDto,
} from '@/types/confirmation';

/**
 * CONFIRMATIONS — groups orders for routing/delivery (cross-app-be `orders`
 * domain). Ported from the dashboard's `useConfirmations.ts`, re-skinned to the
 * POS API clients. The dashboard threaded `userId`; POS drops it (orgId comes
 * from `useOrgContext()`; `x-user-id` is auto-injected by crossAppApi).
 *
 * Base path: `/api/organizations/{org}/confirmations` (via ordersStoreOrgPath).
 *
 * TODO(verify-endpoint): confirm cross-app-be exposes these confirmation routes
 * (POST/PUT/PATCH/DELETE shapes) and that DELETE …/orders/{doc} returns 204.
 */

const base = (orgId: string, suffix = '') => ordersStoreOrgPath(orgId, `/confirmations${suffix}`);

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

interface RawConfirmationsResponse {
  data?: Confirmation[];
  pagination?: RawPagination;
}

function normalizePagination(
  raw: RawPagination | undefined,
  fallbackPage: number,
  fallbackSize: number,
): ConfirmationsPagination {
  return {
    page: raw?.page ?? fallbackPage,
    page_size: raw?.page_size ?? raw?.pageSize ?? fallbackSize,
    total_elements: raw?.total_elements ?? raw?.totalElements ?? 0,
    total_pages: raw?.total_pages ?? raw?.totalPages ?? 1,
  };
}

// ─── List query ──────────────────────────────────────────────────────────────

export interface UseConfirmationsParams {
  orgId: string | undefined;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useConfirmations({
  orgId,
  page = 1,
  pageSize = 12,
  enabled = true,
}: UseConfirmationsParams) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  const path = base(orgId ?? '', `?${params.toString()}`);

  return useQuery<ConfirmationsListResult>({
    queryKey: ['confirmations', orgId, page, pageSize],
    enabled: enabled && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await ordersStoreApi.get<RawConfirmationsResponse>(path);
      return {
        data: res.data ?? [],
        pagination: normalizePagination(res.pagination, page, pageSize),
      };
    },
  });
}

// ─── Single confirmation ──────────────────────────────────────────────────────

export function useConfirmation(orgId: string | undefined, confirmationNumber: string | undefined) {
  return useQuery<Confirmation>({
    queryKey: ['confirmation', orgId, confirmationNumber],
    enabled: !!orgId && !!confirmationNumber,
    queryFn: () =>
      ordersStoreApi.get<Confirmation>(base(orgId!, `/${confirmationNumber}`)),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

function useConfirmationCacheSync(orgId: string | undefined, confirmationNumber?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['confirmations'] });
    if (confirmationNumber) {
      qc.invalidateQueries({ queryKey: ['confirmation', orgId, confirmationNumber] });
    }
  };
}

export function useCreateConfirmation(orgId: string | undefined) {
  const sync = useConfirmationCacheSync(orgId);
  return useMutation<Confirmation, Error, CreateConfirmationDto>({
    mutationFn: (body) => ordersStoreApi.post<Confirmation>(base(orgId!), body),
    onSuccess: () => sync(),
  });
}

/** Append orders to an existing confirmation (PUT). */
export function useUpdateConfirmation(orgId: string | undefined, confirmationNumber: string) {
  const sync = useConfirmationCacheSync(orgId, confirmationNumber);
  return useMutation<Confirmation, Error, UpdateConfirmationDto>({
    mutationFn: (body) =>
      ordersStoreApi.put<Confirmation>(base(orgId!, `/${confirmationNumber}`), body),
    onSuccess: () => sync(),
  });
}

export function useUpdateConfirmationStatus(orgId: string | undefined, confirmationNumber: string) {
  const sync = useConfirmationCacheSync(orgId, confirmationNumber);
  return useMutation<Confirmation, Error, OrderStatus>({
    mutationFn: (status) =>
      ordersStoreApi.patch<Confirmation>(base(orgId!, `/${confirmationNumber}/status`), {
        status: ORDER_STATUS_CODES[status],
      }),
    onSuccess: () => sync(),
  });
}

export function useRemoveOrderFromConfirmation(orgId: string | undefined, confirmationNumber: string) {
  const sync = useConfirmationCacheSync(orgId, confirmationNumber);
  return useMutation<unknown, Error, string>({
    // DELETE may return 204 — `request()` in src/lib/api.ts tolerates empty bodies.
    mutationFn: (documentNumber) =>
      ordersStoreApi.delete(base(orgId!, `/${confirmationNumber}/orders/${documentNumber}`)),
    onSuccess: () => sync(),
  });
}
