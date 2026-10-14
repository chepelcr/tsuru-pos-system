import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ordersEs from '@/locales/es/orders.json';
import type { Order } from '@/types/order';
import OrderDetailPage from './OrderDetailPage';

const state = vi.hoisted(() => ({ order: {} as Order, electronic: false, export: true, invoice: vi.fn(), ticket: vi.fn() }));
vi.mock('@/hooks/useOrders', () => ({
  useOrder: () => ({ data: state.order }),
  useUpdateOrderStatus: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/contexts/OrgContext', () => ({ useOrgContext: () => ({ orgId: 'test-org' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'es', t: (key: string) => (ordersEs as Record<string, string>)[key] ?? key }),
}));
vi.mock('@/contexts/NotificationsContext', () => ({ useNotifications: () => ({ add: vi.fn() }) }));
vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));
vi.mock('@/hooks/useConfirmModal', () => ({ useConfirmModal: () => ({ confirm: vi.fn(), ConfirmModal: () => null }) }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: (_module: string, action: string) => action !== 'export' || state.export }) }));
vi.mock('@/hooks/useSale', () => ({ useSale: () => ({}) }));
vi.mock('@/hooks/useFiscalMode', () => ({ useFiscalMode: () => ({ isElectronic: state.electronic }) }));
vi.mock('@/hooks/useInvoiceOrder', () => ({ useInvoiceOrder: () => ({ billingOrder: null, invoiceOrder: state.invoice }) }));
vi.mock('@/hooks/useOrderTicket', () => ({ useOrderTicket: () => ({ mutate: state.ticket }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/components/documents/EarlyPaymentDiscountDrawer', () => ({ EarlyPaymentDiscountDrawer: () => null }));
vi.mock('@/components/pos/checkout/OrderCheckoutDrawer', () => ({ OrderCheckoutDrawer: () => null }));
vi.mock('@/components/orders/DeliveryDateDialog', () => ({ DeliveryDateDialog: () => null }));
vi.mock('@/components/orders/ReprocessDialog', () => ({ ReprocessDialog: () => null }));
vi.mock('@/components/orders/CrossdockingUploadDialog', () => ({ CrossdockingUploadDialog: () => null }));
vi.mock('@/components/orders/CrossdockingDetailsDialog', () => ({ CrossdockingDetailsDialog: () => null }));

function exampleOrder(): Order {
  return {
    document_number: '2900679464', order_status: 'processing', order_type: '73',
    creation_date: '2026-10-14', delivery_date: '2026-10-16',
    report_color: 'blue', department: '26 - Bebé', comment: 'NO PRETICKET',
    subtotal: 26356, discounts: 835, net_total: 25521, taxes: 3317.73, grand_total: 28838.73,
    attachments: { pdf_url: '/sample.pdf', excel_url: '/sample.xlsx', nuevo_reporte_url: '/report.xlsx' },
    client: { name: 'Cliente de muestra', gln: '7407001003857' },
    supplier: { name: 'Proveedor de muestra', gln: '' },
    lines: [{
      line_number: 1, description: 'ALMOHADA Y FUNDA BEBE COLORES SURTIDOS DOCOMA',
      internal_code: '2645516', code: '7441119600652', cabys: '2719000000000', unit_measure: 'Unid',
      quantity_ordered: 4, unit_price: 4333, tax: 2181.78, line_total: 18964.67,
      taxes: [{ tax_type_id: '01' }],
    }],
  } as Order;
}

beforeEach(() => { state.electronic = false; state.export = true; });

describe('order detail', () => {
  it('shows separate gross, discount, net, tax and final totals and removes the CABYS column', () => {
    state.order = exampleOrder();
    render(<OrderDetailPage orderId={state.order.document_number} />);
    for (const [label, amount] of [
      ['Subtotal', '26 356,00'], ['Descuentos', '835,00'], ['Total neto', '25 521,00'],
      ['Impuestos', '3 317,73'], ['Total del pedido', '28 838,73'],
    ]) {
      const labels = screen.getAllByText(label);
      const row = labels[labels.length - 1].parentElement!;
      expect(row.textContent!.replace(/\s/g, ' ')).toContain(amount);
    }
    expect(within(screen.getByRole('table')).queryByRole('columnheader', { name: 'CABYS' })).toBeNull();
    expect(screen.getByRole('button', { name: 'common.actions' })).toBeTruthy();
  });

  it('keeps zero tax visible without replacing the stored net amount', () => {
    state.order = { ...exampleOrder(), subtotal: 100, discounts: 100, net_total: 0, taxes: 0, grand_total: 0 };
    render(<OrderDetailPage orderId={state.order.document_number} />);
    for (const label of ['Total neto', 'Impuestos']) {
      expect(screen.getByText(label).parentElement!.textContent).toContain('0,00');
    }
  });

  it('offers billing beside downloads and opens checkout for that delivered order', () => {
    state.electronic = true;
    state.order = { ...exampleOrder(), order_status: 'delivered' };
    render(<OrderDetailPage orderId={state.order.document_number} />);
    const actions = within(screen.getByRole('group', { name: 'common.actions' }));
    for (const name of ['PDF', 'Ticket 80mm', 'Excel del pedido']) expect(actions.getByRole('button', { name })).toBeTruthy();
    fireEvent.click(actions.getByRole('button', { name: 'Facturar pedido' }));
    expect(state.invoice).toHaveBeenCalledWith(state.order);
  });

  it('keeps permitted billing available without export permission or attachments', () => {
    state.electronic = true;
    state.export = false;
    state.order = { ...exampleOrder(), order_status: 'delivered', attachments: {} };
    render(<OrderDetailPage orderId={state.order.document_number} />);
    const actions = within(screen.getByRole('group', { name: 'common.actions' }));
    expect(actions.getAllByRole('button')).toHaveLength(1);
    expect(actions.getByRole('button', { name: 'Facturar pedido' })).toBeTruthy();
  });

  it('does not offer a second invoice for an order already linked to a document', () => {
    state.electronic = true;
    state.order = { ...exampleOrder(), order_status: 'delivered', document_id: 'document-1' };
    render(<OrderDetailPage orderId={state.order.document_number} />);
    expect(screen.queryByRole('button', { name: 'Facturar pedido' })).toBeNull();
  });

  it('generates a ticket on demand before any download attachment exists', () => {
    state.order = { ...exampleOrder(), attachments: {} };
    render(<OrderDetailPage orderId={state.order.document_number} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ticket 80mm' }));
    expect(state.ticket).toHaveBeenCalledWith(state.order.document_number);
  });
});
