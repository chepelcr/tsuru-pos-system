import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import PartnerConnection from './PartnerConnection';
import { partnerReturnPath } from '@/lib/partnerReturn';

vi.mock('wouter', async () => ({ ...await vi.importActual('wouter'), useParams: () => ({ context: 'a'.repeat(43) }) }));
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => 'pos-test-token' } } }) }));
vi.mock('@/hooks/useOrgConfigurations', () => ({ useOrgConfigurations: () => ({ data: { username: 'stored-user', certificate: null }, isLoading: false }) }));
vi.mock('@/components/org-settings/hacienda/HaciendaCredentialsStepper', () => ({ HaciendaCredentialsStepper: ({ pending }: { pending: string }) => <p>Pending: {pending}</p> }));
vi.mock('@/components/org-settings/registered-org/PartnerFiscalProfile', () => ({ PartnerFiscalProfile: ({ orgId }: { orgId: string }) => <p>Fiscal profile form: {orgId}</p> }));

function open(data: unknown, status = 200) {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status }));
  vi.stubGlobal('fetch', fetcher);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><LanguageProvider><Router hook={memoryLocation({ path: '/integraciones/ditso/' + 'a'.repeat(43) }).hook}><PartnerConnection /></Router></LanguageProvider></QueryClientProvider>);
  return fetcher;
}
const base = { display_name: 'Workshop test', organization_id: 'org-one', organizations: [], status: 'pending' };

beforeEach(() => {
  localStorage.setItem('language', 'en'); sessionStorage.clear();
  vi.stubEnv('VITE_PARTNER_API_URL', 'https://partner.example.test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); sessionStorage.clear(); });

describe('POS partner onboarding', () => {
  it('opens only missing credentials when the fiscal profile is already complete', async () => {
    const fetcher = open({ ...base, fiscal_readiness: { registered_organization_complete: true, hacienda_credentials_verified: false,
      certificate_and_pin_validated: true, ready: false, next_step: 'hacienda_credentials' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Complete this step' }));
    expect(await screen.findByText('Pending: credentials')).toBeTruthy();
    expect(screen.queryByText(/Fiscal profile form:/)).toBeNull();
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer pos-test-token');
    expect(sessionStorage.getItem('ditsoPartnerReturn')).not.toContain('pos-test-token');
  });
  it('requires explicit consent after authoritative fiscal preflight', async () => {
    open({ ...base, fiscal_readiness: { registered_organization_complete: true, hacienda_credentials_verified: true,
      certificate_and_pin_validated: true, ready: true, next_step: 'consent' } });
    const button = await screen.findByRole('button', { name: 'Authorize and return to Ditsö' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(button.disabled).toBe(false);
  });
  it('allows connecting without fiscal setup after explicit consent', async () => {
    open({ ...base, fiscal_readiness: { registered_organization_complete: false, hacienda_credentials_verified: false,
      certificate_and_pin_validated: false, ready: false, next_step: 'fiscal_profile' } });
    const button = await screen.findByRole('button', { name: 'Authorize and continue without invoicing' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(button.disabled).toBe(false);
    expect(screen.queryByText(/Fiscal profile form:/)).toBeNull();
  });
  it('allows operational authorization when fiscal status is unavailable', async () => {
    open({ ...base, fiscal_readiness: { available: false, registered_organization_complete: false, hacienda_credentials_verified: false,
      certificate_and_pin_validated: false, ready: false, next_step: 'retry' } });
    expect(await screen.findByText(/Fiscal status could not be checked/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Authorize and continue without invoicing' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Complete this step' })).toBeNull();
  });
  it('binds fiscal setup to the organization selected by the partner flow', async () => {
    open({ ...base, fiscal_readiness: { registered_organization_complete: false, hacienda_credentials_verified: false,
      certificate_and_pin_validated: false, ready: false, next_step: 'fiscal_profile' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Complete this step' }));
    expect(await screen.findByText('Fiscal profile form: org-one')).toBeTruthy();
  });
  it('shows a recoverable error instead of setup forms when the provider fails', async () => {
    open({}, 503);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/Fiscal profile form:/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
  it('does not accept external or malformed return paths', () => {
    for (const path of ['https://evil.example', '//evil.example', '/dashboard', '/integraciones/ditso/a?token=secret']) {
      sessionStorage.setItem('ditsoPartnerReturn', path);
      expect(partnerReturnPath()).toBeNull();
    }
    sessionStorage.setItem('ditsoPartnerReturn', '/integraciones/ditso/' + 'a'.repeat(43));
    expect(partnerReturnPath()).toBe('/integraciones/ditso/' + 'a'.repeat(43));
  });
});
