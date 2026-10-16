import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Pagination } from './Pagination';

function footer(overrides: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn(); const onPageSizeChange = vi.fn();
  render(<LanguageProvider><Pagination page={1} totalPages={13} totalElements={253} pageSize={20}
    onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} itemName="documents" {...overrides} /></LanguageProvider>);
  return { onPageChange, onPageSizeChange };
}
beforeEach(() => { localStorage.setItem('language', 'en'); Element.prototype.scrollIntoView = vi.fn(); });

describe('shared list footer', () => {
  it('shows a one-based page, item range and page-size selector', () => {
    footer();
    expect(screen.getByText('Showing 1-20 of 253 documents')).toBeTruthy();
    expect(screen.getByText('Page 1 of 13')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Show' }).textContent).toBe('20');
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('navigates using one-based values', () => {
    const callbacks = footer({ page: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(callbacks.onPageChange.mock.calls).toEqual([[1], [3]]);
  });
  it('caps the last range at the total and disables next', () => {
    footer({ page: 13 });
    expect(screen.getByText('Showing 241-253 of 253 documents')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('keeps controls available on a single page', () => {
    footer({ totalPages: 1, totalElements: 4 });
    expect(screen.getByText('Showing 1-4 of 4 documents')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Show' })).toBeTruthy();
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
  });
  it('represents an empty list as zero items with no enabled navigation', () => {
    footer({ totalPages: 0, totalElements: 0 });
    expect(screen.getByText('Showing 0-0 of 0 documents')).toBeTruthy();
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('includes the actual page size and resets to page one when changing it', () => {
    const callbacks = footer({ page: 3, pageSizeOptions: [12, 24, 50] });
    fireEvent.click(screen.getByRole('combobox', { name: 'Show' }));
    expect(screen.getByRole('option', { name: '20' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: '50' }));
    expect(callbacks.onPageChange).toHaveBeenCalledWith(1);
    expect(callbacks.onPageSizeChange).toHaveBeenCalledWith(50);
  });
  it('uses Mostrar and the same format in Spanish', () => {
    localStorage.setItem('language', 'es'); footer({ itemName: 'documentos' });
    expect(screen.getByText('Mostrando 1-20 de 253 documentos')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Mostrar' })).toBeTruthy();
    expect(screen.getByText('Página 1 de 13')).toBeTruthy();
  });
  it('does not display page zero if a caller passes zero', () => {
    footer({ page: 0 });
    expect(screen.getByText('Page 1 of 13')).toBeTruthy();
    expect(screen.getByText('Showing 1-20 of 253 documents')).toBeTruthy();
  });
});
