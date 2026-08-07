import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { downloadFromUrl } from '@/lib/downloadUtils';
import type { Order } from '@/types/order';
import { CrossdockingDetailsDialog } from './CrossdockingDetailsDialog';

vi.mock('@/hooks/useRbac', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

vi.mock('@/hooks/useOverlayLayer', () => ({
  useOverlayLayer: () => ({ isTopLayer: () => true }),
}));

vi.mock('@/lib/downloadUtils', () => ({ downloadFromUrl: vi.fn() }));

const order = {
  document_number: 'PO-100',
  report_color: 'green',
  attachments: {
    pdf_url: 'https://uploads.example/order.pdf',
    excel_url: 'https://uploads.example/order.xlsx',
    nuevo_reporte_url: 'https://uploads.example/report.xlsx',
  },
  crossdocking: {
    attachments: {
      pdf_url: 'https://uploads.example/crossdocking.pdf',
      excel_url: 'https://uploads.example/crossdocking.xlsx',
    },
    sale_points: [],
    item_summary: [],
    box_summary: [],
    totals: { total_sale_points: 0, total_line_items: 0, total_boxes: 0, total_units: 0 },
  },
} as unknown as Order;

describe('CrossdockingDetailsDialog', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'es');
    vi.mocked(downloadFromUrl).mockClear();
  });

  it('keeps every PDF, Excel, and generated-report download available', () => {
    render(
      <LanguageProvider>
        <CrossdockingDetailsDialog open onClose={() => undefined} order={order} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'Descargar Excel' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Nuevo reporte' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Excel del pedido' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    expect(downloadFromUrl).toHaveBeenNthCalledWith(1, 'https://uploads.example/crossdocking.pdf');
    expect(downloadFromUrl).toHaveBeenNthCalledWith(2, 'https://uploads.example/order.pdf');
  });
});
