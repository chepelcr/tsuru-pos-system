import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/locales';
import HistoricalDocumentsPage from './HistoricalDocumentsPage';

const state = vi.hoisted(() => ({
  language: 'en' as 'en' | 'es', canUpdate: true, canExport: true,
  requested: false, documents: [] as unknown[], page: 0, pages: 1,
  mutate: vi.fn(), list: vi.fn(),
}));
vi.mock('@/contexts/OrgContext', () => ({ useOrgContext: () => ({ orgId: 'org-1' }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({
  language: state.language, t: (key: string, params: Record<string, string | number> = {}) => Object.entries(params).reduce((value, [name, replacement]) => value.split(`{${name}}`).join(String(replacement)), translations[state.language][key] ?? key),
}) }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: (_module: string, action: string) => action === 'update' ? state.canUpdate : action === 'export' ? state.canExport : true }) }));
vi.mock('@/hooks/useHistoricalDocuments', () => ({
  useHistoricalDocuments: (...args: unknown[]) => {
    state.list(...args);
    return { data: { historical_requested: state.requested, data: state.documents, pagination: { page: state.page, page_size: 20, total_pages: state.pages, total_elements: state.documents.length } }, refetch: vi.fn() };
  },
  useSyncHistoricalDocuments: () => ({ mutate: state.mutate }),
}));

beforeEach(() => {
  state.language = 'en'; state.canUpdate = true; state.canExport = true;
  state.requested = false; state.documents = []; state.page = 0; state.pages = 1;
});

describe('historical page operator states', () => {
  it('distinguishes never requested history and launches the initial sweep', () => {
    render(<HistoricalDocumentsPage />);
    expect(screen.getByText('History has never been synced')).not.toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Sync' })[0]);
    expect(state.mutate).toHaveBeenCalledWith(false);
  });
  it('forces an already-requested sweep and hides actions when permissions deny them', () => {
    state.requested = true;
    const { rerender } = render(<HistoricalDocumentsPage />);
    expect(screen.getByText('No historical documents')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));
    expect(state.mutate).toHaveBeenCalledWith(true);
    state.canUpdate = false; state.canExport = false;
    rerender(<HistoricalDocumentsPage />);
    expect(screen.queryByRole('button', { name: 'Sync' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export page CSV' })).toBeNull();
  });
  it('renders Spanish partial acceptance, Decimal amounts, and translates page 2 to API page 1', () => {
    state.language = 'es'; state.requested = true; state.pages = 2;
    state.documents = [{ clave: '50612092600011664050600100001010000000042100000001', document_type: '01', consecutive_key: '00100001010000000042', branch_number: 1, terminal_number: 1, emission_date: '2026-09-12T00:00:00Z', issuer_name: 'Comercio', receiver_name: null, atv_status: 2, source: 'HISTORY', total_amount: '1234.56789' }];
    render(<HistoricalDocumentsPage />);
    expect(screen.getByText('Aceptado parcialmente', { selector: 'span' })).not.toBeNull();
    expect(screen.getByText('Factura Electrónica')).not.toBeNull();
    expect(screen.getByText('1 234,56789', { exact: false })).not.toBeNull();
    expect(screen.getByRole('link', { name: '00100001010000000042' }).getAttribute('href')).toContain('/dashboard/documents/historical/506');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(state.list).toHaveBeenLastCalledWith('org-1', {}, 1, 20, true);
  });
});
