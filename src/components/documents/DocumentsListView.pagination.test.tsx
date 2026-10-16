import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DocumentsListView } from './DocumentsListView';

const state = vi.hoisted(() => ({ total: 253, received: false, sales: vi.fn() }));
vi.mock('@/store/documentStore', () => ({ useDocumentStore: () => ({ is_received: state.received }) }));
vi.mock('@/hooks/useSales', () => ({ useSales: (params: { page: number; size: number }) => {
  state.sales(params);
  const count = Math.max(0, Math.min(params.size, state.total - params.page * params.size));
  return { data: { data: Array.from({ length: count }, (_, at) => ({ sale_id: `${params.page}-${at}` })),
    pagination: { page: params.page, page_size: params.size, total_pages: Math.ceil(state.total / params.size), total_elements: state.total } }, isLoading: false };
} }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: () => false }) }));
vi.mock('@/hooks/useRefreshValidation', () => ({ useRefreshValidation: () => ({}) }));
vi.mock('@/contexts/NotificationsContext', () => ({ useNotifications: () => ({ add: vi.fn() }) }));
vi.mock('@/hooks/useDocumentImport', () => ({ useDocumentImportStore: (selector: (value: { openDrawer: () => void }) => unknown) => selector({ openDrawer: vi.fn() }) }));
vi.mock('@/components/common/ListToolbar', () => ({ ListToolbar: ({ secondary, statusSlot }: { secondary: ReactNode; statusSlot: ReactNode }) => <div>{statusSlot}{secondary}</div> }));
vi.mock('./IssuedReceivedToggle', () => ({ IssuedReceivedToggle: () => null }));
vi.mock('./DocumentTypesFilter', () => ({ DocumentTypesFilter: ({ onChange }: { onChange: (types: string[]) => void }) => <button onClick={() => onChange(['01'])}>Filter type</button> }));
vi.mock('./DocumentCard', () => ({ DocumentCard: ({ doc }: { doc: { sale_id: string } }) => <article>{doc.sale_id}</article> }));
vi.mock('./ComplexSearchModal', () => ({ ComplexSearchModal: () => null }));
vi.mock('./DocumentActionModal', () => ({ DocumentActionModal: () => null }));
vi.mock('./DocumentPdfDialog', () => ({ DocumentPdfDialog: () => null }));

const page = () => <LanguageProvider><DocumentsListView orgId="org-1" /></LanguageProvider>;
beforeEach(() => {
  localStorage.setItem('language', 'en'); state.total = 253; state.received = false; state.sales.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('document footer API page adapter', () => {
  it('shows page 1 of 13 for API page zero and maps Next to API page one', () => {
    render(page());
    expect(screen.getByText('Page 1 of 13')).toBeTruthy();
    expect(screen.getByText('Showing 1-20 of 253 documents')).toBeTruthy();
    expect(state.sales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 13')).toBeTruthy();
    expect(state.sales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(state.sales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 20 }));
  });
  it('changes the requested size and resets the API page to zero', () => {
    render(page()); fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Show' }));
    fireEvent.click(screen.getByRole('option', { name: '50' }));
    expect(state.sales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 50 }));
    expect(screen.getByText('Showing 1-50 of 253 documents')).toBeTruthy();
    expect(screen.getByText('Page 1 of 6')).toBeTruthy();
  });
  it.each([4, 0])('keeps a size selector for %s documents', (total) => {
    state.total = total; render(page());
    expect(screen.getByRole('combobox', { name: 'Show' })).toBeTruthy();
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
  });
  it('resets paging when switching emitted/received documents', () => {
    const view = render(page()); fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    state.received = true; view.rerender(page());
    expect(state.sales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 20, issued: false }));
    expect(screen.getByText('Page 1 of 13')).toBeTruthy();
  });
  it('resets paging when changing document types', () => {
    render(page()); fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Filter type' }));
    expect(state.sales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, document_types: ['01'] }));
  });
});
