import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, historicalDocumentsPath } from '@/lib/api';
import type { HistoricalDocument, HistoricalDocumentFilters, HistoricalDocumentListResponse, HistoricalSyncResponse } from '@/types/historicalDocument';

/** The history API accepts date bounds directly, unlike sales' sale_date ranges. */
export function historicalDocumentsQuery(filters: HistoricalDocumentFilters = {}, page = 0, size = 20): string {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.document_types?.length) params.set('document_types', filters.document_types.join(','));
  for (const key of ['branch_number', 'terminal_number', 'atv_status'] as const) {
    if (filters[key] !== undefined) params.set(key, String(filters[key]));
  }
  const search = {
    ...(filters.search_term?.trim() ? { searchTerm: filters.search_term.trim() } : {}),
    ...(filters.start_date ? { start_date: filters.start_date } : {}),
    ...(filters.end_date ? { end_date: filters.end_date } : {}),
    sort: { emissionDate: filters.sort_direction ?? 'desc' },
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
