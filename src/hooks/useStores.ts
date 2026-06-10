import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crossAppApi, crossAppOrgPath } from '@/lib/api';
import type {
  Store,
  StoreListResponse,
  StoreRequestDto,
  StoreUploadResult,
} from '@/types';

/**
 * Stores (B2B) — a client's individual stores / points-of-sale.
 *
 * Ported from the dashboard `useStores`, re-pointed to `crossAppApi` +
 * `crossAppOrgPath` (the POS cross-app-be client). Endpoint shapes are
 * byte-identical to the dashboard's `/api/organizations/{org}/clients/{id}/...`.
 *
 * TODO(verify-endpoint): confirm cross-app-be (behind POS VITE_ORDERS_API_URL)
 * exposes `/clients/{id}/stores` (GET/POST), `/stores/{id}` (PATCH for both
 * data and status), and `/stores/upload` (`{ file, filename }` → `{ count }`).
 */

interface StoresFilters {
  search?: string;
  page?: number;
  page_size?: number;
}

export function useStores(
  orgId: string | undefined,
  clientId: string | undefined,
  filters?: StoresFilters,
) {
  const searchParam = filters?.search ? `&search=${encodeURIComponent(filters.search)}` : '';
  const pageParam = filters?.page ? `&page=${filters.page}` : '';
  const sizeParam = `&page_size=${filters?.page_size ?? 12}`;

  return useQuery({
    queryKey: ['stores', orgId, clientId, filters],
    enabled: !!orgId && !!clientId,
    staleTime: 30_000,
    queryFn: () =>
      crossAppApi.get<StoreListResponse>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/stores?${searchParam}${pageParam}${sizeParam}`),
      ),
  });
}

export function useStoreMutations(orgId: string | undefined, clientId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['stores', orgId, clientId] });

  const createStore = useMutation({
    mutationFn: (dto: StoreRequestDto) =>
      crossAppApi.post<Store>(crossAppOrgPath(orgId!, `/clients/${clientId}/stores`), dto),
    onSuccess: invalidate,
  });

  const updateStore = useMutation({
    mutationFn: ({ storeId, dto }: { storeId: string; dto: StoreRequestDto }) =>
      crossAppApi.patch<Store>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/stores/${storeId}`),
        dto,
      ),
    onSuccess: invalidate,
  });

  const updateStoreStatus = useMutation({
    mutationFn: ({ storeId, status }: { storeId: string; status: number }) =>
      crossAppApi.patch<Store>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/stores/${storeId}`),
        { status },
      ),
    onSuccess: invalidate,
  });

  const uploadStores = useMutation({
    mutationFn: ({ file, filename }: { file: string; filename: string }) =>
      crossAppApi.post<StoreUploadResult>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/stores/upload`),
        { file, filename },
      ),
    onSuccess: invalidate,
  });

  return { createStore, updateStore, updateStoreStatus, uploadStores };
}
