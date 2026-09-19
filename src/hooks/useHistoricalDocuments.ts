import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, historicalDocumentsPath } from '@/lib/api';
import { DOCUMENT_TYPES } from '@/types/invoice';
import type {
  HistoricalDocument, HistoricalDocumentFilters, HistoricalDocumentListResponse,
  HistoricalDocumentSummaryResponse, HistoricalSyncResponse,
} from '@/types/historicalDocument';

/** The history API accepts date bounds directly, unlike sales' sale_date ranges. */
export function historicalDocumentsQuery(filters: HistoricalDocumentFilters = {}, page = 0, size = 20): string {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.document_types?.length) params.set('document_types', filters.document_types.join(','));
  for (const key of ['branch_number', 'terminal_number', 'atv_status'] as const) {
    if (filters[key] !== undefined) params.set(key, String(filters[key]));
  }
  const search = {
    ...(filters.search_term?.trim() ? { search_term: filters.search_term.trim() } : {}),
    ...(filters.start_date ? { start_date: filters.start_date } : {}),
    ...(filters.end_date ? { end_date: filters.end_date } : {}),
    sort: { emission_date: filters.sort_direction ?? 'desc' },
  };
  // URLSearchParams performs the URL encoding once; FastAPI receives JSON.
  params.set('search', JSON.stringify(search));
  return params.toString();
}

export function useHistoricalDocuments(orgId: string, filters: HistoricalDocumentFilters, page = 0, size = 20, enabled = true) {
  const query = historicalDocumentsQuery(filters, page, size);
  return useQuery({
    queryKey: ['historical-documents', orgId, query],
    queryFn: () => salesApi.get<HistoricalDocumentListResponse>(historicalDocumentsPath(orgId, `?${query}`)),
    enabled: !!orgId && enabled,
  });
}

export function useHistoricalDocument(orgId: string, clave: string, enabled = true) {
  return useQuery({
    queryKey: ['historical-document', orgId, clave],
    queryFn: () => salesApi.get<HistoricalDocument>(historicalDocumentsPath(orgId, `/${encodeURIComponent(clave)}`)),
    enabled: !!orgId && !!clave && enabled,
  });
}

export function useSyncHistoricalDocuments(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (force: boolean) => salesApi.post<HistoricalSyncResponse>(historicalDocumentsPath(orgId, '/sync'), force ? { force: true } : {}),
    onSuccess: (response) => {
      client.setQueriesData<HistoricalDocumentListResponse>({ queryKey: ['historical-documents', orgId] }, (current) =>
        current ? { ...current, historical_requested: response.historical_requested } : current);
      return client.invalidateQueries({ queryKey: ['historical-documents', orgId] });
    },
  });
}

/**
 * Whole-history counts for the Reportes summary — ONE request.
 *
 * This used to fire eleven parallel `size=1` list requests (total, four ATV
 * verdicts, six document types) and read each one's `total_elements`. The
 * numbers were right and the responses were tiny, so it looked cheap. It was
 * not: the AWS account's Lambda concurrency ceiling is **10**, so the eleventh
 * request was rejected with `ConcurrentInvocationLimitExceeded` every single
 * time. API Gateway renders that 429 as a 500, and a gateway 500 carries no
 * `Access-Control-Allow-Origin`, so the browser reported it as a bare network
 * error with no status at all — and `isError` being `.some(...)` meant one
 * unlucky slice blanked the entire card. Deterministically, on every load.
 *
 * The backend now answers all of it from one `GROUP BY`. Two lessons worth
 * keeping: a summary card must not cost a request per number on it, and N
 * parallel requests where N is a constant you chose is a limit you have
 * silently assumed.
 *
 * Still deliberately NOT an aggregate over a fetched page — `size` caps at 250,
 * so summing rows would describe the most recent page and call it a report.
 *
 * Money is not summarised here: totals cannot be derived from a count, and a
 * partial sum on a fiscal report is worse than no sum at all.
 */
export function useHistoricalDocumentsSummary(orgId: string, enabled = true) {
  const query = useQuery({
    queryKey: ['historical-summary', orgId],
    queryFn: () => salesApi.get<HistoricalDocumentSummaryResponse>(historicalDocumentsPath(orgId, '/summary')),
    enabled: !!orgId && enabled,
    staleTime: 5 * 60 * 1000,
  });

  const total = query.data?.total ?? 0;
  const statusCounts = new Map((query.data?.by_status ?? []).map((row) => [row.atv_status, row.count]));

  // Only the types the POS knows how to label are charted; anything else (05/06/07,
  // or a code Hacienda adds later) lands in `other` so the bars visibly account
  // for the headline instead of quietly falling short of it.
  const byType = DOCUMENT_TYPES
    .map((dt) => ({ code: dt.code, count: query.data?.by_type.find((row) => row.document_type === dt.code)?.count ?? 0 }))
    .filter((row) => row.count > 0);
  const accountedFor = byType.reduce((sum, row) => sum + row.count, 0);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    total,
    byStatus: ([0, 1, 2, 3] as const).map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
    byType,
    other: Math.max(0, total - accountedFor),
    // `historical_requested` distinguishes an empty ledger from one never swept.
    historicalRequested: query.data?.historical_requested,
    refetch: () => { void query.refetch(); },
  };
}
