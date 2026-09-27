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
 * `search_term`, `status`, `sale_date` and `total_amount` as RANGES in the
 * platform grammar (`a~b`, open-ended `a~` / `~b`, or a single value — a single
 * date is that whole day), `sort: {field: "asc"|"desc"}`,
 * `branch_number` / `terminal_number`, `origin`. snake_case only.
 *
 * That DTO ignores unknown keys, so a misnamed filter is not an error — it is
 * no filter. `toWireSearch.test.ts` pins every key.
 */
/** `a~b`, or open-ended `a~` / `~b`; nothing when both sides are empty. */
function rangeValue(lo: string | number | undefined, hi: string | number | undefined): string | undefined {
  const a = lo === undefined || lo === "" ? "" : String(lo);
  const b = hi === undefined || hi === "" ? "" : String(hi);
  return a || b ? `${a}~${b}` : undefined;
}

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

  let saleDate: string | undefined;
  if (s.dateMode === "single" && s.dateValue) {
    const v = s.dateValue;
    saleDate = s.dateOp === ">=" ? `${v}~` : s.dateOp === "<=" ? `~${v}` : v;
  } else {
    saleDate = rangeValue(s.start_date, s.end_date);
  }
  if (saleDate) out.sale_date = saleDate;

  let totalAmount: string | undefined;
  if (s.totalMode === "single" && s.totalValue !== undefined) {
    const v = String(s.totalValue);
    totalAmount = s.totalOp === ">" ? `${v}~` : s.totalOp === "<" ? `~${v}` : v;
  } else {
    totalAmount = rangeValue(s.totalMin, s.totalMax);
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
