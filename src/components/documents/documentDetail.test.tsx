// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentDetailPage from '@/pages/dashboard/DocumentDetailPage';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ salesApi: { get, post }, salesOrgPath: (org: string, suffix: string) => `/sales/${org}${suffix}`, validationRefreshPath: () => '/refresh', validationPath: () => '/validation', xmlPath: () => '/xml', notificationsPath: () => '/notifications' }));
vi.mock('@/contexts/OrgContext', () => ({ useOrgContext: () => ({ orgId: 'org' }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'es', t: (key: string) => key }) }));
vi.mock('@/contexts/NotificationsContext', () => ({ useNotifications: () => ({ add: vi.fn() }) }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: () => true, isReady: true }) }));
vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: () => undefined }));
vi.mock('@/hooks/useOverlayLayer', () => ({ useOverlayLayer: () => ({ isTopLayer: () => true }) }));
vi.mock('@/components/ui/OverlayPortal', () => ({ OverlayPortal: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: any) => <div>{children}</div>, Badge: ({ children }: any) => <span>{children}</span>, Icon: () => null,
  EmptyState: ({ title }: any) => <p>{title}</p>, Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Menu: ({ items }: any) => <div>{items.map((item: any) => <button key={item.label} onClick={item.action}>{item.label}</button>)}</div>,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const doc = {
  sale_id: 'sale', organization_id: 'org', document_type: '01', sale_date: '2026-09-22',
  receiver: { name: 'Receiver', trade_name: 'Trade', nationality: '188', customer_type_code: '02', phone: { number: '88888888' } },
  issuer: { name: 'Issuer' }, details: [], payments: [],
  atv_validation: { validation_status: 3, validation_date: '2026-09-22', errors: [{ code: '-45', message: 'Correct the receiver', row: 2, column: 3 }] },
  attachments: { xml_url: 'https://bucket/doc.xml', pdf_url: 'https://bucket/doc.pdf', hacienda_response_url: 'https://bucket/response.xml' },
  other_fields: [{ code: 'WMNumeroOrden', other_text: 'PO-123' }, { code: 'TsuruNumeroPedido', other_text: 'PM-123' }],
};
function mount() {
  get.mockResolvedValue(doc);
  post.mockResolvedValue({});
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DocumentDetailPage saleId="sale" /></QueryClientProvider>);
}

describe('document detail requests and modal', () => {
  it('loads just the document, opens either pedido directly, and shows errors only in validation', async () => {
    mount();
    await screen.findByText('Receiver');
    expect(get.mock.calls.map(([path]) => path)).toEqual(['/sales/org/sale']);
    expect(screen.getByRole('link', { name: 'PO-123' }).getAttribute('href')).toBe('/dashboard/orders/PO-123');
    expect(screen.getByRole('link', { name: 'PM-123' }).getAttribute('href')).toBe('/dashboard/orders/PM-123');
    expect(screen.queryByText('Correct the receiver')).toBeNull();
    fireEvent.click(screen.getByText('documents.action.validation'));
    expect(await screen.findByText('Correct the receiver')).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('documents.validation.refresh'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/refresh', {}));
  });
  it('opens the PDF from the document without fetching files', async () => {
    mount(); await screen.findByText('Receiver');
    fireEvent.click(screen.getByText('documents.action.pdf'));
    expect(screen.getByTitle('documents.action.pdfTitle').getAttribute('src')).toBe('https://bucket/doc.pdf');
    expect(get).toHaveBeenCalledTimes(1);
  });
});
