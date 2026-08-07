import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { CrossdockingSalePointItem, Order } from '@/types/order';
import { CrossdockingSummaries } from './CrossdockingSummaries';

function item(overrides: Partial<CrossdockingSalePointItem>): CrossdockingSalePointItem {
  return {
    internal_code: 'ITEM-1',
    original_code: 'GLN-1',
    description: 'Producto',
    units_per_box: 6,
    quantity: 2,
    total_units: 12,
    sent: 1,
    missing: 1,
    ...overrides,
  };
}

const order = {
  order_id: 1,
  company_id: 'org-1',
  document_number: 'PO-100',
  document_type: 'PO',
  order_type: '73',
  creation_date: '01/08/2026',
  delivery_date: '08/08/2026',
  order_status: 'processing',
  client: { name: 'Cliente', gln: 'CLIENT-GLN' },
  supplier: { name: 'Proveedor SA', gln: 'SUPPLIER-GLN', internal_code: 'V-22' },
  delivery_location: { code: 'CD-1', name: 'Centro principal', gln: 'DELIVERY-GLN' },
  event: '',
  department: { department_code: '22', name: 'Textiles', supplier_code: 'V-22' },
  comment: '',
  line_count: 0,
  total_quantities: 0,
  subtotal: 0,
  discounts: 0,
  net_total: 0,
  taxes: 0,
  grand_total: 0,
  bgm011: null,
  confirmation_number: 'CONF-9',
  report_color: 'orange',
  attachments: {},
  lines: [],
  order_totals: {
    total_lines: 0,
    total_quantity_ordered: 0,
    total_units_ordered: 0,
    total_quantity_dispatched: 0,
    total_quantity_received: 0,
    subtotal: 0,
    net_total: 0,
    grand_total: 0,
  },
  crossdocking: {
    attachments: null,
    sale_points: [
      {
        store_number: '101',
        store_name: 'Escazú',
        full_name: '101 - Escazú',
        slot_id: 'A-1',
        items: [
          item({ description: 'Producto uno', sent: 2, missing: 0 }),
          item({ internal_code: 'ITEM-2', description: 'Producto dos', units_per_box: 4 }),
          item({ internal_code: 'ITEM-3', description: 'Producto tres', units_per_box: 2 }),
          item({ internal_code: 'ITEM-4', description: 'Producto cuatro', units_per_box: 8 }),
        ],
        total_boxes: 999,
        total_units: 999,
      },
    ],
    item_summary: [],
    box_summary: [],
    totals: { total_sale_points: 99, total_line_items: 99, total_boxes: 999, total_units: 999 },
  },
} satisfies Order;

describe('CrossdockingSummaries', () => {
  beforeEach(() => localStorage.setItem('language', 'es'));

  it('renders every API row and derives totals from the displayed sale-point items', () => {
    render(
      <LanguageProvider>
        <CrossdockingSummaries order={order} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Producto cuatro')).not.toBeNull();

    const itemsStat = screen.getByText('Total de artículos').parentElement?.parentElement;
    expect(itemsStat).not.toBeNull();
    expect(within(itemsStat!).getByText('4')).not.toBeNull();

    const checkoutsStat = screen.getByText('Total de cajas').parentElement?.parentElement;
    expect(checkoutsStat).not.toBeNull();
    expect(within(checkoutsStat!).getByText('1')).not.toBeNull();
    expect(checkoutsStat?.classList.contains('text-center')).toBe(true);

    const packagesStat = screen.getByText('Total de bultos').parentElement?.parentElement;
    expect(packagesStat).not.toBeNull();
    expect(within(packagesStat!).getByText('5')).not.toBeNull();
    expect(packagesStat?.classList.contains('text-center')).toBe(true);
  });

  it('maps the order report color to the sale-point footer', () => {
    const { container } = render(
      <LanguageProvider>
        <CrossdockingSummaries order={order} />
      </LanguageProvider>,
    );

    expect(container.querySelector('.crossdocking-report')?.getAttribute('style')).toContain('--report-header-medium: #c65811');
    expect(container.querySelector('tfoot tr')?.classList.contains('crossdocking-report-total')).toBe(true);
  });

  it('counts unique products instead of repeating them for every checkout', () => {
    const distributedOrder = structuredClone(order);
    distributedOrder.crossdocking.sale_points = Array.from({ length: 13 }, (_, index) => ({
      store_number: String(index + 1),
      store_name: `Caja ${index + 1}`,
      full_name: `${index + 1} - Caja ${index + 1}`,
      slot_id: '',
      items: [
        item({ internal_code: 'PRODUCT-A', description: 'Producto A' }),
        item({ internal_code: 'PRODUCT-B', description: 'Producto B' }),
      ],
      total_boxes: 2,
      total_units: 12,
    }));

    render(
      <LanguageProvider>
        <CrossdockingSummaries order={distributedOrder} />
      </LanguageProvider>,
    );

    const productsStat = screen.getByText('Total de artículos').parentElement?.parentElement;
    expect(productsStat).not.toBeNull();
    expect(within(productsStat!).getByText('2')).not.toBeNull();
    const checkoutsStat = screen.getByText('Total de cajas').parentElement?.parentElement;
    expect(checkoutsStat).not.toBeNull();
    expect(within(checkoutsStat!).getByText('13')).not.toBeNull();
  });
});
