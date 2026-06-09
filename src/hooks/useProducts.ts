import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, ordersOrgPath } from "../lib/api";
import { useAuthContext } from "../contexts/AuthContext";
import { useOrganization } from "./useOrganization";
import type { ProductListResponse } from "../types";

export type { Product } from "../types";

interface UseProductsOptions {
  search?: string;
  category_id?: string;
  page?: number;
  page_size?: number;
  enabled?: boolean;
}

export interface ProductPriceBounds {
  net_min: number | null;
  net_max: number | null;
  sale_min: number | null;
  sale_max: number | null;
}

/**
 * Fetch min/max price bounds across the org's non-deleted products so the
 * filter slider can size its thumbs to reality. Cached aggressively — these
 * shift slowly relative to a filter session.
 */
export function useProductPriceBounds(orgId: string | undefined) {
  return useQuery({
    queryKey: ["product-price-bounds", orgId],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
    queryFn: () =>
      ordersApi.get<ProductPriceBounds>(ordersOrgPath(orgId!, "/products/price-bounds")),
  });
}

export function useProducts(options: UseProductsOptions = {}) {
  const { search, category_id, page = 1, page_size = 24, enabled = true } = options;
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);

  const searchParts: string[] = ["status:1"];
  if (search?.trim()) searchParts.push(`name:*${search.trim()}*`);
  if (category_id) searchParts.push(`category_id:${category_id}`);
  const searchParam = searchParts.join(",");

  return useQuery({
    queryKey: ["products", org?.id, searchParam, page, page_size],
    enabled: !!user && !!org && enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: () => {
      const params = new URLSearchParams({
        search: searchParam,
        page: String(page),
        page_size: String(page_size),
      });
      return ordersApi.get<ProductListResponse>(
        ordersOrgPath(org!.id, `/products?${params.toString()}`)
      );
    },
  });
}

/**
 * Bulk status mutation — loops the existing single-product status endpoint
 * (`PATCH /products/{id}/status`, body `{ status }`) sequentially over the
 * given ids. Status: 1 = active, 2 = inactive, 3 = soft-deleted. Sequential
 * (not Promise.all) to match the page's existing bulk-delete behaviour.
 *
 * `ProductsPage` currently inlines this loop reusing its own `toggleActive`
 * mutation; this hook is provided for reuse elsewhere (plan 03 §5A).
 */
export function useBulkProductStatus(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: number }) => {
      for (const id of ids) {
        await ordersApi.patch(ordersOrgPath(orgId!, `/products/${id}/status`), { status });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", orgId] }),
  });
}

/**
 * One-shot Excel/CSV bulk import — `POST /products/parse` with a base64 blob.
 * `ProductExcelUpload` calls `ordersApi` directly for its inline feedback
 * needs; this hook mirrors that contract for reuse.
 *
 * TODO(verify-endpoint): confirmed present on cross-app-be
 * (products_controller.parse_products_excel, body ExcelDTO { data, name,
 * contentType }, returns ProductListResponse).
 */
export function useParseProductsExcel(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { data: string; name?: string; contentType?: string }) =>
      ordersApi.post<ProductListResponse>(ordersOrgPath(orgId!, "/products/parse"), payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", orgId] }),
  });
}
