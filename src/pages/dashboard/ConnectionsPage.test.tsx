import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ConnectionsPage from './ConnectionsPage';

const state = vi.hoisted(() => ({ orgId: 'org-one', owner: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => ({ user: { userId: 'owner' } }) }));
vi.mock('@/hooks/useOrganization', () => ({ useOrganization: () => ({ useDefaultOrganization: () => ({ data: { id: state.orgId, name: 'My workshop' } }) }) }));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ is_owner: state.owner, isReady: true }) }));
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => 'pos-test-token' } } }) }));

const active = { id: 'connection-one', application_name: 'Ditsö', connection_name: 'My workshop', scopes: ['products:read', 'invoices:submit'],
  status: 'active', expires_at: '2026-12-01T00:00:00Z', revoked_at: null };

function show(fetcher: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetcher);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const element = () => <QueryClientProvider client={qc}><LanguageProvider><ConnectionsPage /></LanguageProvider></QueryClientProvider>;
  const view = render(element());
  return { ...view, refresh: () => view.rerender(element()) };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  state.orgId = 'org-one'; state.owner = true;
  localStorage.setItem('language', 'en');
  vi.stubEnv('VITE_PARTNER_API_URL', 'https://partner.example.test');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('third-party connections', () => {
  it('requires confirmation and revokes the selected organization using its POS session', async () => {
    let disabled = false;
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method === 'POST') { disabled = true; return json({ revoked: true }); }
      return json({ data: [{ ...active, status: disabled ? 'revoked' : 'active', revoked_at: disabled ? '2026-11-05T00:00:00Z' : null }] });
    });
    show(fetcher);
    fireEvent.click(await screen.findByRole('button', { name: 'Disable connection' }));
    const dialog = await screen.findByRole('dialog', { name: 'Disable Ditsö?' });
    expect(fetcher.mock.calls.filter(call => call[1].method === 'POST')).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(fetcher.mock.calls).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Disable connection' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disable connection' }));
    expect(await screen.findByText(/Connection disabled\./)).toBeTruthy();
    expect(await screen.findByText('Disabled')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Disable connection' })).toBeNull();
    const post = fetcher.mock.calls.find(call => call[1].method === 'POST')!;
    expect(post[0]).toBe('https://partner.example.test/api/partner-connections/organizations/org-one/connection-one/revoke');
    expect(post[1].headers).toEqual({ Authorization: 'Bearer pos-test-token' });
    expect(post[1].cache).toBe('no-store');
  });

  it('keeps the confirmation open and shows a retryable failure without claiming success', async () => {
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => init.method === 'POST' ? json({}, 503) : json({ data: [active] }));
    show(fetcher);
    fireEvent.click(await screen.findByRole('button', { name: 'Disable connection' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disable connection' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/Connection disabled\./)).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await waitFor(() => expect((within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('does not request connection data for members who are not the owner', () => {
    state.owner = false;
    const fetcher = vi.fn(); show(fetcher);
    expect(screen.getByRole('alert').textContent).toContain('Only the owner');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('clears a pending confirmation when switching organization', async () => {
    const fetcher = vi.fn(async (_url: string) => json({ data: state.orgId === 'org-one' ? [active] : [] }));
    const view = show(fetcher);
    fireEvent.click(await screen.findByRole('button', { name: 'Disable connection' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    state.orgId = 'org-two'; view.refresh();
    expect(await screen.findByText('No connected applications yet')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetcher.mock.calls.some(call => String(call[0]).endsWith('/org-two'))).toBe(true);
  });

  it('shows a configuration error instead of an empty list when the API is missing', async () => {
    vi.stubEnv('VITE_PARTNER_API_URL', '');
    const fetcher = vi.fn(); show(fetcher);
    expect((await screen.findByRole('alert')).textContent).toContain('Connections are unavailable');
    expect(screen.queryByText('No connected applications yet')).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
