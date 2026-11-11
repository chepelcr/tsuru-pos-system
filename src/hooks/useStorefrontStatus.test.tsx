import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStorefrontStatus } from './useStorefrontStatus';
import { emitRealtimeControlEvent } from '@/lib/realtimeBus';
import { useNotificationMutations } from './useUserNotifications';
import type { ServerNotification } from '@/types/notification';
const apiGet = vi.hoisted(() => vi.fn().mockResolvedValue({ infrastructure_status: 'active' }));
vi.mock('@/lib/api', () => ({ api: { get: apiGet }, salesApi: {}, userNotificationsPath: () => '', orgContentPath: (user: string, org: string, path: string) => `/api/users/${user}/organizations/${org}${path}` }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => ({ user: { userId: 'user-a' } }) }));
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
describe('storefront status refresh', () => {
  it('does not request tenant data without permission, then requests the exact user and organization', async () => {
    const { wrapper } = setup();
    const view = renderHook(({ allowed, org }) => useStorefrontStatus('user-a', org, allowed), { wrapper, initialProps: { allowed: false, org: 'org-a' } });
    expect(apiGet).not.toHaveBeenCalled();
    view.rerender({ allowed: true, org: 'org-a' });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(apiGet).toHaveBeenLastCalledWith('/api/users/user-a/organizations/org-a/deployments/status');
    view.rerender({ allowed: true, org: 'org-b' });
    await waitFor(() => expect(apiGet).toHaveBeenLastCalledWith('/api/users/user-a/organizations/org-b/deployments/status'));
  });
  it('refreshes after a socket gap and after storefront notifications for this organization only', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => ({ status: useStorefrontStatus('user-a', 'org-a', true), notifications: useNotificationMutations() }), { wrapper });
    await waitFor(() => expect(result.current.status.isSuccess).toBe(true));
    const calls = apiGet.mock.calls.length;
    act(() => emitRealtimeControlEvent({ kind: 'reconnected' }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(calls + 1));
    act(() => result.current.notifications.receive({ id: 'n1', organization_id: 'org-b', event_type: 'storefront.ready' } as ServerNotification));
    expect(apiGet).toHaveBeenCalledTimes(calls + 1);
    act(() => result.current.notifications.receive({ id: 'n2', organization_id: 'org-a', event_type: 'storefront.template.applied' } as ServerNotification));
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(calls + 2));
  });
});
