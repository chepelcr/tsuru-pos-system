import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, historicalDocumentsPath } from '@/lib/api';
import { DOCUMENT_TYPES } from '@/types/invoice';
import type { HistoricalDocument, HistoricalDocumentFilters, HistoricalDocumentListResponse, HistoricalSyncResponse } from '@/types/historicalDocument';

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
 * Whole-history counts for the Reportes summary.
 *
 * Deliberately NOT an aggregate over a fetched page. `size` caps at 250, so
 * summing rows would quietly describe only the most recent page and call it a
 * report. Instead each slice is a `size=1` request read for its
 * `total_elements`, which the backend computes over the entire history — cheap
 * responses, exact numbers, and it stays correct as the ledger grows.
 *
 * Money is not summarised here: totals cannot be derived from a count, and a
 * partial sum on a fiscal report is worse than no sum at all.
 */
export function useHistoricalDocumentsSummary(orgId: string, enabled = true) {
  const slices = useMemo(() => {
    const byStatus = ([0, 1, 2, 3] as const).map((atv_status) => ({
      kind: 'status' as const, key: String(atv_status), query: historicalDocumentsQuery({ atv_status }, 0, 1),
    }));
    const byType = DOCUMENT_TYPES.map((dt) => ({
      kind: 'type' as const, key: dt.code, query: historicalDocumentsQuery({ document_types: [dt.code] }, 0, 1),
    }));
    return [{ kind: 'total' as const, key: 'total', query: historicalDocumentsQuery({}, 0, 1) }, ...byStatus, ...byType];
  }, []);

  const results = useQueries({
    queries: slices.map((slice) => ({
      queryKey: ['historical-summary', orgId, slice.query],
      queryFn: () => salesApi.get<HistoricalDocumentListResponse>(historicalDocumentsPath(orgId, `?${slice.query}`)),
      enabled: !!orgId && enabled,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  const count = (key: string) => {
    const index = slices.findIndex((slice) => slice.key === key);
    return results[index]?.data?.pagination.total_elements ?? 0;
  };

  const total = count('total');
  const byType = DOCUMENT_TYPES
    .map((dt) => ({ code: dt.code, count: count(dt.code) }))
    .filter((row) => row.count > 0);

  // Hacienda history can contain types the POS never issues (05/06/07), so the
  // remainder is shown rather than silently dropped — a bar chart that does not
  // add up to the headline is a bug the reader has to notice for us.
  const accountedFor = byType.reduce((sum, row) => sum + row.count, 0);
  const other = Math.max(0, total - accountedFor);

  return {
    isLoading,
    isError,
    total,
    byStatus: ([0, 1, 2, 3] as const).map((status) => ({ status, count: count(String(status)) })),
    byType,
    other,
    // `historical_requested` distinguishes an empty ledger from one never swept.
    historicalRequested: results[0]?.data?.historical_requested,
    refetch: () => { results.forEach((r) => { void r.refetch(); }); },
  };
}
