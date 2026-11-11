import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { StorefrontStatusCard, safeStoreUrl } from './StorefrontStatusCard';

const state = vi.hoisted(() => ({
  allowed: true, edit: true,
  query: { data: undefined as any, isError: false, isPending: false, isFetching: false, refetch: vi.fn() },
  notifications: [] as any[],
  hook: vi.fn(),
}));
vi.mock('@/hooks/useRbac', () => ({ usePermissions: () => ({ can: (_m: string, _a: string, section: string) => section === 'deployments' ? state.allowed : state.edit }) }));
vi.mock('@/hooks/useStorefrontStatus', () => ({ useStorefrontStatus: (...args: unknown[]) => { state.hook(...args); return state.query; } }));
vi.mock('@/hooks/useUserNotifications', () => ({ useUserNotifications: () => ({ data: { data: state.notifications } }) }));
const show = () => render(<LanguageProvider><StorefrontStatusCard userId="user-a" orgId="org-a" templateName="Ferretería" /></LanguageProvider>);
beforeEach(() => {
  localStorage.setItem('language', 'en');
  state.allowed = true; state.edit = true; state.notifications = [];
  state.query = { data: { infrastructure_status: 'active', infrastructure_updated_at: '2026-11-11T10:00:00Z', store_url: 'https://ddev.cloudfront.net', template_id: 'template-a' }, isError: false, isPending: false, isFetching: false, refetch: vi.fn() };
});
describe('storefront status card', () => {
  it('shows a confirmed live link, selected design and separate content action', () => {
    show();
    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByText('Selected design: Ferretería')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Visit store' }).getAttribute('href')).toBe('https://ddev.cloudfront.net/');
    expect(screen.getByRole('link', { name: 'Edit content' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(state.query.refetch).toHaveBeenCalled();
  });
  it.each(['pending', 'provisioning', 'failed', 'deleting', 'not_published', 'unexpected'])('withholds the live link when infrastructure is %s', (status) => {
    state.query.data.infrastructure_status = status;
    show();
    expect(screen.queryByRole('link', { name: 'Visit store' })).toBeNull();
  });
  it('fails closed without deployment permission and hides editing without content permission', () => {
    state.allowed = false;
    const view = show();
    expect(screen.queryByRole('region')).toBeNull();
    expect(state.hook).toHaveBeenLastCalledWith('user-a', 'org-a', false);
    state.allowed = true; state.edit = false;
    view.rerender(<LanguageProvider><StorefrontStatusCard userId="user-a" orgId="org-a" /></LanguageProvider>);
    expect(screen.queryByRole('link', { name: 'Edit content' })).toBeNull();
  });
  it('does not show stale readiness after a status request fails', () => {
    state.query.isError = true;
    show();
    expect(screen.getByText('Status unavailable')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Visit store' })).toBeNull();
  });
  it('keeps the latest failed template update visible on an otherwise live store, scoped to the organization', () => {
    state.notifications = [
      { organization_id: 'other', event_type: 'storefront.ready', created_on: '2026-11-11T13:00:00Z', payload: { stage: 'ready' } },
      { organization_id: 'org-a', event_type: 'storefront.failed', created_on: '2026-11-11T12:00:00Z', payload: { stage: 'failed' } },
    ];
    show();
    expect(screen.getByText(/The latest update failed/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Visit store' })).toBeTruthy();
  });
  it('ignores an old failure when infrastructure has since recovered', () => {
    state.notifications = [{ organization_id: 'org-a', event_type: 'storefront.failed', created_on: '2026-11-10T12:00:00Z', payload: { stage: 'failed' } }];
    show();
    expect(screen.queryByText(/The latest update failed/)).toBeNull();
  });
  it('shows loading in Spanish without a premature live link', () => {
    localStorage.setItem('language', 'es'); state.query.isPending = true;
    show();
    expect(screen.getByText('Comprobando estado')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Visitar tienda' })).toBeNull();
  });
  it.each(['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', '/account'])('rejects unsafe external URL %s', (url) => {
    expect(safeStoreUrl(url)).toBeNull();
  });
});
