/**
 * Store (B2B) sub-entity — a client's individual store/point-of-sale.
 * Plan 02 (Customers B2B). snake_case to match cross-app-be + POS `Client`.
 *
 * ⚠️ The dashboard mixed snake/camel (`store.store_code` vs `store.storeId`).
 * POS locks snake_case at the type boundary (matches cross-app-be).
 * TODO(verify-endpoint): confirm the BE `StoreSearchFilters` sort/search field
 * names (dashboard used camel `storeName`/`slotId` — verify against the BE).
 */

export interface Store {
  store_id: string;
  company_id: string;
  client_id: string;
  store_code: string;
  store_name?: string | null;
  slot_id?: string | null;
  chain?: string | null;
  gln?: string | null;
  /** 1 = active, 2 = inactive, 3 = deleted. */
  status?: number;
}

export interface StoreRequestDto {
  store_code: string;
  store_name?: string;
  slot_id?: string;
  chain?: string;
}

export interface StoreListResponse {
  data: Store[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}

/** Result of the bulk Excel upload (`POST /clients/{id}/stores/upload`). */
export interface StoreUploadResult {
  count: number;
}
