import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentVersionProvider } from '@/contexts/DocumentVersionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { otherChargeAmount } from '@/lib/otherCharges';
import type { OtherCharge } from '@/types/invoice';
import type { SaleReference } from '@/types/reference';
import type { ChainClientInfo } from '@/types/order';
import { SaleConditionSelect } from './fields/SaleConditionSelect';
import { OtherChargesSection } from './sections/OtherChargesSection';
import { ReferencesSection } from './sections/ReferencesSection';
import { OrderInfoSection } from './sections/OrderInfoSection';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => `header.${btoa(JSON.stringify({ sub: 'test-user' }))}.signature` } } }),
}));

const requests: URL[] = [];
let failCatalog = '';
const datasets: Record<string, unknown> = {
  'document-versions': [{ id: 2, version_date: '2025-09-01', version: '4.4' }],
  'sale-conditions': [{ code: '01', description: 'Contado' }, { code: '02', description: 'Crédito' }],
  'other-charges': [{ code: '06', description: 'Impuesto de servicio' }, { code: '99', description: 'Otros' }],
  references: [{ code: '01', description: 'Factura electrónica' }, { code: '99', description: 'Otros' }],
  'reference-codes': [{ code: '01', description: 'Anula documento' }, { code: '03', description: 'Corrige monto' }],
  departments: { data: [{ department_id: 'dept-26', department_code: '26', name: 'Bebé', supplier_code: '019596262' }] },
  stores: { data: [{ store_id: 'store-7422', store_code: '7422', store_name: 'CEDI COYOL', gln: '7407001010251' }] },
};

function Fields() {
  const [condition, setCondition] = useState('01');
  const [charges, setCharges] = useState<OtherCharge[]>([{ type: '06', description: 'Servicio', percentage: 10 }]);
  const [refs, setRefs] = useState<SaleReference[]>([{ type: '01', code: '01', number: '', date: '2026-10-14', reason: '' }]);
  const [chain, setChain] = useState<ChainClientInfo>({ department_code: '26', store_code: '7422' });
  return <>
    <SaleConditionSelect value={condition} onChange={setCondition} />
    <OtherChargesSection isExpanded onToggle={() => {}} charges={charges} onChange={setCharges} linesSubtotal={1000} errors={[]} />
    <output data-testid="charge-amount">{otherChargeAmount(charges[0], 1000)}</output>
    <ReferencesSection isExpanded onToggle={() => {}} references={refs} onChange={setRefs} documentType="01" />
    <OrderInfoSection isExpanded onToggle={() => {}} chain={null} isChainClient orgId="org-1" clientId="client-1" data={chain} onChange={(patch) => setChain((prev) => ({ ...prev, ...patch }))} />
  </>;
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><DocumentVersionProvider isoCode="188"><Fields /></DocumentVersionProvider></LanguageProvider></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.setItem('language', 'es');
  requests.length = 0;
  failCatalog = '';
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    const name = Object.keys(datasets).find((key) => url.pathname.includes(`/${key}`));
    const failed = name === failCatalog;
    const body = failed ? { message: 'Unavailable' } : datasets[name ?? ''];
    return { ok: !failed, status: failed ? 503 : 200, headers: new Headers(), text: async () => JSON.stringify(body), json: async () => body } as Response;
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('order billing catalogs', () => {
  it('loads the real hooks with a document version and offers selectable catalog values', async () => {
    mount();
    expect(screen.getAllByRole('status').some((node) => node.textContent?.includes('Cargando opciones'))).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('Condición de venta *').textContent).toBe('Contado'));
    await waitFor(() => expect(screen.getByLabelText('Departamento').textContent).toBe('26 — Bebé'));

    fireEvent.click(screen.getByLabelText('Condición de venta *'));
    fireEvent.click(screen.getByRole('option', { name: 'Crédito' }));
    expect(screen.getByLabelText('Condición de venta *').textContent).toBe('Crédito');

    fireEvent.click(screen.getByLabelText('Tipo de cargo'));
    fireEvent.click(screen.getByRole('option', { name: '99 · Otros' }));
    expect(screen.getByLabelText('Tipo de cargo').textContent).toBe('99 · Otros');

    fireEvent.click(screen.getByLabelText('Código *'));
    fireEvent.click(screen.getByRole('option', { name: 'Corrige monto' }));
    expect(screen.getByLabelText('Código *').textContent).toBe('Corrige monto');
    const fiscal = requests.filter((url) => /\/(sale-conditions|other-charges|reference-codes|references)\//.test(url.pathname));
    expect(fiscal.length).toBe(4);
    expect(fiscal.every((url) => url.searchParams.get('document_version_id') === '2')).toBe(true);
  });

  it.each(['sale-conditions', 'other-charges', 'reference-codes', 'departments'])('recovers %s after a failed request', async (catalog) => {
    failCatalog = catalog;
    mount();
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('No se pudieron cargar las opciones.');
    failCatalog = '';
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(requests.filter((url) => url.pathname.includes(`/${catalog}`)).length).toBe(2);
  });

  it('preserves the charge when switching between percentage and fixed amount', async () => {
    mount();
    await screen.findByText('06 · Impuesto de servicio');
    expect(screen.getByTestId('charge-amount').textContent).toBe('100');
    fireEvent.click(screen.getByRole('button', { name: 'Monto fijo' }));
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('100');
    expect(screen.getByTestId('charge-amount').textContent).toBe('100');
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Porcentaje del subtotal' }));
    expect((screen.getByLabelText('Porcentaje') as HTMLInputElement).value).toBe('25');
    expect(screen.getByTestId('charge-amount').textContent).toBe('250');
    expect(screen.getByRole('button', { name: 'Porcentaje del subtotal' }).getAttribute('aria-pressed')).toBe('true');
  });
});
