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
 * The modal's filters in sales-api's `search` contract (`DocumentSearchDTO`):
 * `search_term`, `status`, `start_date` / `end_date` (ISO; a bare date end is
 * the whole day), `total_min` / `total_max`, `sort: {field: "asc"|"desc"}`,
 * `branch_number` / `terminal_number`, `origin`.
 *
 * That DTO IGNORES unknown keys, so a misnamed filter is not an error — it is
 * no filter. The date used to travel as `sale_date: "a~b"` and the total as
 * `total_amount`, and the sort as the string `"sale_date,asc"` (a 400): none of
 * the three ever reached the query. Everything here is snake_case.
 */
export function toWireSearch(s: ComplexSearchFilters | undefined): Record<string, unknown> | undefined {
  if (!s) return undefined;

  const out: Record<string, unknown> = {};

  // Matched server-side against consecutive, key and the receiver's name,
  // business name, email and id.
  if (s.searchTerm?.trim()) out.search_term = s.searchTerm.trim();
  if (s.status) out.status = s.status;
  // Sort options are `field,direction`.
  if (s.sort) {
    const [field, direction] = s.sort.split(",");
    if (field) out.sort = { [field]: direction === "asc" ? "asc" : "desc" };
  }
  // A terminal code only means something inside its branch: both travel together.
  if (s.branch_number != null) out.branch_number = s.branch_number;
  if (s.branch_number != null && s.terminal_number != null) out.terminal_number = s.terminal_number;
  if (s.origin) out.origin = s.origin;

  if (s.dateMode === "single" && s.dateValue) {
    if (s.dateOp !== "<=") out.start_date = s.dateValue;
    if (s.dateOp !== ">=") out.end_date = s.dateValue;
  } else {
    if (s.start_date) out.start_date = s.start_date;
    if (s.end_date) out.end_date = s.end_date;
  }

  if (s.totalMode === "single" && s.totalValue !== undefined) {
    if (s.totalOp !== "<") out.total_min = s.totalValue;
    if (s.totalOp !== ">") out.total_max = s.totalValue;
  } else {
    if (s.totalMin !== undefined) out.total_min = s.totalMin;
    if (s.totalMax !== undefined) out.total_max = s.totalMax;
  }

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

  const params = new URLSearchParams();
  if (document_types?.length) params.set('document_types', document_types.join(','));
  if (issued !== undefined) params.set('issued', String(issued));
  if (wireSearch) {
    // URLSearchParams encodes; encoding here too sent "%7B%22…" and sales-api
    // answered 400 to every filtered list.
    params.set('search', JSON.stringify(wireSearch));
  }
  params.set('page', String(page));
  params.set('size', String(size));

  const queryString = params.toString();
  const path = salesOrgPath(orgId, queryString ? `?${queryString}` : '');

  return useQuery<SaleListResponse>({
    queryKey: ['sales', orgId, document_types, issued, wireSearch, page, size],
    queryFn: () => salesApi.get<SaleListResponse>(path),
    enabled: enabled && !!orgId,
  });
}
