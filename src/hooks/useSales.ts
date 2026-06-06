import { useQuery } from '@tanstack/react-query';
import { salesApi, salesOrgPath } from '@/lib/api';
import type { SaleListResponse } from '@/types/invoice';
import type { ComplexSearchFilters } from '@/types/document';

interface UseSalesParams {
  orgId: string;
  /** Hacienda document type codes ("01", "04", ...). */
  document_types?: string[];
  issued?: boolean;
  search?: ComplexSearchFilters;
  page?: number;
  size?: number;
  enabled?: boolean;
}

/**
 * Fields the toolbar free-text term should match against (OR). Listed here so
 * the BE — once sales-api's filter parser lands — can opt-in to multi-field
 * matching without the FE needing another release.
 */
const TERM_OR_FIELDS = ['consecutive_number', 'document_key', 'receiver_name'] as const;

/**
 * Convert the modal's local filter shape into the sales-api wire format.
 *
 * Date and total filters collapse to a single field using the between (`~`)
 * pattern — matching the cross-app-be convention (`price:50~150`).
 * Open-ended sides are sent as `X~` / `~Y` so the BE can treat each bound
 * independently when sales-api lands its filter parser.
 *   • Single `=`  X  → `sale_date: "X"`        / `total_amount: "X"`
 *   • Single `>=` X  → `sale_date: "X~"`       / `total_amount: "X~"` (`>` for numeric)
 *   • Single `<=` Y  → `sale_date: "~Y"`       / `total_amount: "~Y"` (`<` for numeric)
 *   • Range  X..Y    → `sale_date: "X~Y"`      / `total_amount: "X~Y"`
 *
 * The free-text term emits a single `searchTerm` plus an explicit `search_fields`
 * array so the BE knows to OR-match across consecutive number, document key,
 * and receiver name.
 */
function toWireSearch(s: ComplexSearchFilters | undefined): Record<string, unknown> | undefined {
  if (!s) return undefined;

  const out: Record<string, unknown> = {};

  if (s.searchTerm) {
    out.searchTerm = s.searchTerm;
    out.search_fields = [...TERM_OR_FIELDS];
  }
  if (s.status) out.status = s.status;
  if (s.sort)   out.sort = s.sort;

  // sale_date
  let saleDate: string | undefined;
  if (s.dateMode === 'single' && s.dateValue) {
    const v = s.dateValue;
    saleDate = s.dateOp === '>=' ? `${v}~` : s.dateOp === '<=' ? `~${v}` : v;
  } else {
    const lo = s.start_date;
    const hi = s.end_date;
    if (lo && hi) saleDate = `${lo}~${hi}`;
    else if (lo)  saleDate = `${lo}~`;
    else if (hi)  saleDate = `~${hi}`;
  }
  if (saleDate) out.sale_date = saleDate;

  // total_amount
  let totalAmount: string | undefined;
  if (s.totalMode === 'single' && s.totalValue !== undefined) {
    const v = String(s.totalValue);
    totalAmount = s.totalOp === '>' ? `${v}~` : s.totalOp === '<' ? `~${v}` : v;
  } else {
    const lo = s.totalMin;
    const hi = s.totalMax;
    if (lo !== undefined && hi !== undefined) totalAmount = `${lo}~${hi}`;
    else if (lo !== undefined) totalAmount = `${lo}~`;
    else if (hi !== undefined) totalAmount = `~${hi}`;
  }
  if (totalAmount) out.total_amount = totalAmount;

  return Object.keys(out).length ? out : undefined;
}

export function useSales({
  orgId,
  document_types,
  issued,
  search,
  page = 0,
  size = 20,
  enabled = true,
}: UseSalesParams) {
  const wireSearch = toWireSearch(search);
  console.log('[useSales] Hook called with:', { orgId, document_types, issued, search, wireSearch, page, size, enabled });

  const params = new URLSearchParams();
  if (document_types?.length) params.set('document_types', document_types.join(','));
  if (issued !== undefined) params.set('issued', String(issued));
  if (wireSearch) {
    params.set('search', encodeURIComponent(JSON.stringify(wireSearch)));
  }
  params.set('page', String(page));
  params.set('size', String(size));

  const queryString = params.toString();
  const path = salesOrgPath(orgId, queryString ? `?${queryString}` : '');
  console.log('[useSales] API path:', path);

  return useQuery<SaleListResponse>({
    queryKey: ['sales', orgId, document_types, issued, wireSearch, page, size],
    queryFn: async () => {
      console.log('[useSales] Fetching data from:', path);
      try {
        const result = await salesApi.get<SaleListResponse>(path);
        console.log('[useSales] API response:', result);
        return result;
      } catch (error) {
        console.error('[useSales] API error:', error);
        throw error;
      }
    },
    enabled: enabled && !!orgId,
  });
}
