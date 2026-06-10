import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, ordersOrgPath } from "../lib/api";
import type { Category } from "../types";

interface CategoryListResponse {
  data: Category[];
}

export function useCategories(orgId: string | undefined) {
  return useQuery({
    queryKey: ["categories", orgId],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      ordersApi.get<CategoryListResponse>(
        ordersOrgPath(orgId!, "/categories?page_size=100")
      ),
  });
}

/**
 * Create/update payload for cross-app-be `CategoryRequestDTO`.
 *
 * Casing matches the actual BE DTO (snake_case, `image_1`/`image_2` with the
 * underscore before the digit) — verified against
 * `app/dtos/requests/category_request_dto.py`. The image blobs are `ImageDTO`
 * (`{ data, name, contentType }`). This deliberately differs from the scaffolded
 * `InsertCategory` type in `src/types/product.ts` (which guessed `image1`/
 * `image2`); the real contract is encoded here. See plan 03 §6 + openIssues.
 */
export interface CategoryImageBlob {
  data: string;
  name: string;
  contentType: string;
}

export interface CategoryRequestPayload {
  name?: string;
  slug?: string;
  description?: string;
  background_color?: string;
  button_color?: string;
  /** Legacy base64 blob upload (kept for back-compat). */
  image_1?: CategoryImageBlob;
  image_2?: CategoryImageBlob;
  /** Preferred: absolute URL of an already-uploaded asset (org media library). */
  image1_url?: string | null;
  image2_url?: string | null;
  sort_order?: number;
}

/**
 * TODO(verify-endpoint): POST /api/organizations/{org}/categories on
 * cross-app-be — confirmed present (categories_controller.create_category,
 * body CategoryRequestDTO, returns CategoryResponse, 201).
 */
export function useCreateCategory(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryRequestPayload) =>
      ordersApi.post<Category>(ordersOrgPath(orgId!, "/categories"), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", orgId] }),
  });
}

/**
 * TODO(verify-endpoint): PUT /api/organizations/{org}/categories/{id} on
 * cross-app-be — confirmed present (categories_controller.update_category).
 */
export function useUpdateCategory(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryRequestPayload }) =>
      ordersApi.put<Category>(ordersOrgPath(orgId!, `/categories/${id}`), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", orgId] }),
  });
}

/**
 * TODO(verify-endpoint): DELETE /api/organizations/{org}/categories/{id} on
 * cross-app-be — confirmed present (categories_controller.delete_category,
 * returns 204).
 */
export function useDeleteCategory(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      ordersApi.delete<void>(ordersOrgPath(orgId!, `/categories/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", orgId] }),
  });
}
