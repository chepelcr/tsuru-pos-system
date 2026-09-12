import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { historicalDocumentsQuery, useHistoricalDocument, useHistoricalDocuments, useSyncHistoricalDocuments } from './useHistoricalDocuments';
import { formatHistoricalAmount, formatHistoricalDate, historicalDocumentsCsv } from '@/lib/historicalDocuments';
import { translations } from '@/locales';

vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => 'test-token' } } }) }));

const clave = '50612092600011664050600100001010000000042100000001';
// Frozen wire contract: Decimal fields are strings, no receiver, nested errors.
const wireDocument = {
  historicalDocumentId: 'history-42', organizationId: 'org-1', clave,
  documentType: '01', branchNumber: 1, terminalNumber: 1,
  consecutiveNumber: 42, consecutiveKey: '00100001010000000042',
  emissionDate: '2026-09-12T00:30:00Z', issuerName: 'Comercio', issuerIdType: '01', issuerIdNumber: '116640506',
  receiverName: null, receiverIdType: null, receiverIdNumber: null,
  totalAmount: '1234.56789', taxTotal: '142.03000', atvStatus: 2,
  atvValidationDate: '2026-09-12T00:31:00Z', atvErrors: [{ errorCode: '123', message: 'Detalle de Hacienda' }],
  parentClave: null, source: 'HISTORY', saleId: null, status: 1,
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function response(body: unknown) { return new Response(JSON.stringify(body), { status: 200 }); }
afterEach(() => vi.unstubAllGlobals());

describe('historical document query contract', () => {
  it('maps all filters, zero-indexed pagination, processing=0, and a single URL encoding', () => {
    const params = new URLSearchParams(historicalDocumentsQuery({ document_types: ['01', '03'], branch_number: 1, terminal_number: 7, atv_status: 0, search_term: '  José & hijos  ', start_date: '2026-01-01', end_date: '2026-09-12' }, 0, 250));
    expect(Object.fromEntries(params)).toEqual({
      page: '0', size: '250', document_types: '01,03', branch_number: '1', terminal_number: '7', atv_status: '0',
      search: JSON.stringify({ searchTerm: 'José & hijos', start_date: '2026-01-01', end_date: '2026-09-12', sort: { emissionDate: 'desc' } }),
    });
  });
  it('omits unset scalar filters, supports one-sided dates and ascending sort', () => {
    const params = new URLSearchParams(historicalDocumentsQuery({ start_date: '2026-09-01', sort_direction: 'asc' }, 2, 50));
    expect(params.get('page')).toBe('2');
    expect(params.has('document_types')).toBe(false);
    expect(params.has('atv_status')).toBe(false);
    expect(JSON.parse(params.get('search')!)).toEqual({ start_date: '2026-09-01', sort: { emissionDate: 'asc' } });
  });
});

describe('historical documents through the actual sales API client', () => {
  it('reads the camelCase list as snake_case without zeroing Decimal totals or losing never-synced metadata', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response({ data: [wireDocument], historicalRequested: false, pagination: { page: 0, pageSize: 20, totalElements: 1, totalPages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useHistoricalDocuments('org-1', {}), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.historical_requested).toBe(false);
    expect(result.current.data?.pagination).toEqual({ page: 0, page_size: 20, total_elements: 1, total_pages: 1 });
    const doc = result.current.data!.data[0];
    expect(doc).toMatchObject({ historical_document_id: 'history-42', document_type: '01', emission_date: '2026-09-12T00:30:00Z', receiver_name: null, atv_status: 2, total_amount: '1234.56789', tax_total: '142.03000', atv_errors: [{ error_code: '123', message: 'Detalle de Hacienda' }] });
    expect(formatHistoricalAmount(doc.total_amount, 'en')).toBe('1,234.56789');
    expect(formatHistoricalDate(doc.emission_date, 'en')).not.toBe('Invalid Date');
    expect(fetchMock.mock.calls[0][0]).toContain('/api/organizations/org-1/historical-documents?');
  });
  it('reads detail as a direct row, not a data envelope', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(wireDocument)));
    const { result } = renderHook(() => useHistoricalDocument('org-1', clave), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.clave).toBe(clave);
    expect(result.current.data?.consecutive_key).toBe('00100001010000000042');
    expect(result.current.data?.atv_status).toBe(2);
  });
  it('does not read when the resolved permission denies historical access', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useHistoricalDocuments('org-1', {}, 0, 20, false), { wrapper: wrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('sends force only for a rerun and parses the accepted response', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response({ organizationId: 'org-1', requested: true, historicalRequested: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSyncHistoricalDocuments('org-1'), { wrapper: wrapper() });
    await act(async () => { await result.current.mutateAsync(false); });
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{}');
    await act(async () => { await result.current.mutateAsync(true); });
    expect(fetchMock.mock.calls[1][0]).toContain('/historical-documents/sync');
    expect(fetchMock.mock.calls[1][1]?.body).toBe('{"force":true}');
    expect(result.current.data).toEqual({ organization_id: 'org-1', requested: true, historical_requested: true });
  });
  it('retains null amounts, handles malformed values, and exports exact decimals with safe CSV cells', async () => {
    expect(formatHistoricalAmount(null, 'en')).toBe('—');
    expect(formatHistoricalAmount('invalid', 'en')).toBe('—');
    expect(formatHistoricalAmount('0.00000', 'en')).toBe('0.00');
    expect(formatHistoricalDate('bad date', 'es')).toBe('—');
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response({ ...wireDocument, issuerName: '=HYPERLINK("bad")' })));
    const { result } = renderHook(() => useHistoricalDocument('org-1', clave), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const csv = historicalDocumentsCsv([result.current.data!], (key) => translations.en[key]);
    expect(csv).toContain('"1234.56789"');
    expect(csv).toContain('"Partially accepted"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
