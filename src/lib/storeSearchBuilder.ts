/**
 * Store list search-string builder (cross-app-be `StoreSearchFilters`).
 *
 * Ported from the dashboard `lib/storeSearchBuilder.ts`. POS locks snake_case
 * at the type boundary (matches cross-app-be + the POS `Client`), so the sort
 * field map uses snake_case keys rather than the dashboard's camelCase.
 *
 * TODO(verify-endpoint): confirm the BE search filter syntax (`field:value`)
 * and `orderBy>field` sort field names for stores. The dashboard used camelCase
 * (`storeName`/`slotId`); verify the actual `StoreSearchFilters` accepts these
 * snake_case names. If the BE expects camelCase, flip SORT_FIELD_MAP values.
 */

export type StoreSortField = 'store_code' | 'store_name' | 'chain' | 'slot_id';

export interface StoreSearchFilters {
  textSearch?: string;
  sortBy?: StoreSortField | string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_FIELD_MAP: Record<string, string> = {
  store_code: 'store_code',
  store_name: 'store_name',
  chain: 'chain',
  slot_id: 'slot_id',
};

export function buildStoreSearchString(filters: StoreSearchFilters): string {
  const parts: string[] = [];

  if (filters.textSearch) {
    const v = `*${filters.textSearch}*`;
    parts.push(`store_name:${v}`);
  }

  if (filters.sortBy) {
    const apiField = SORT_FIELD_MAP[filters.sortBy] || filters.sortBy;
    const op = filters.sortOrder === 'asc' ? '>' : '<';
    parts.push(`orderBy${op}${apiField}`);
  }

  return parts.join(',');
}
