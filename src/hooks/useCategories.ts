import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, ordersOrgPath } from "../lib/api";
import { isOfflineError } from "../lib/offline";
import { cacheCategories, readCachedCategories } from "../services/offlineCatalog";
import type { Category } from "../types";

interface CategoryListResponse {
  data: Category[];
}

export function useCategories(orgId: string | undefined) {
  return useQuery({
    queryKey: ["categories", orgId],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 15,
    // Mirrors to IndexedDB and reads back when offline (docs/OFFLINE.md).
    queryFn: async () => {
      try {
        const response = await ordersApi.get<CategoryListResponse>(
          ordersOrgPath(orgId!, "/categories?page_size=100")
        );
        void cacheCategories(orgId!, response.data ?? []);
        return response;
      } catch (error) {
        if (!isOfflineError(error)) throw error;
        return readCachedCategories(orgId!);
      }
    },
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

export const CATEGORY_STATUS = { ACTIVE: 1, INACTIVE: 2, DELETED: 3 } as const;
export type CategoryStatus = (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS];

/** A category without a status (older payloads) counts as active. */
export const isCategoryActive = (category: Category) =>
  (category.status ?? CATEGORY_STATUS.ACTIVE) === CATEGORY_STATUS.ACTIVE;

/** One past the highest `sort_order`, so a new category lands after the last one. */
export const nextCategorySortOrder = (categories: Category[]) =>
  categories.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1;

/**
 * Activate (1), deactivate (2) or delete (3) through `PATCH /categories/{id}`.
 * Delete is soft, like every other entity: products keep their category link and
 * the category leaves every listing. The hard `DELETE` route is not used.
 */
export function useSetCategoryStatus(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CategoryStatus }) =>
      ordersApi.patch<Category>(ordersOrgPath(orgId!, `/categories/${id}`), { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", orgId] }),
  });
}
