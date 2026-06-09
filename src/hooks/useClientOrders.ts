import { useQuery } from '@tanstack/react-query';
import { ordersStoreApi, ordersStoreOrgPath } from '@/lib/api';
import type { Order } from '@/hooks/useOrders';

/**
 * Orders linked to a client by GLN — gated on the Orders module (plan 02 §2.4 /
 * §10). POS has an `/orders` list endpoint + `useOrders` hook, but no order
 * detail route is wired yet, so this is intentionally shipped behind a flag and
 * the rows are non-navigable until the Orders module fully lands.
 *
 * Set `ORDERS_MODULE_READY = true` (and wire the order-detail deep link) once
 * the Orders migration completes — that flips the query from disabled to live.
 *
 * TODO(verify-endpoint): confirm cross-app-be accepts
 * `/orders?search=clientGln:{gln}` once Orders is migrated; until then the query
 * stays disabled and returns [] so we never fetch a half-built endpoint.
 */
export const ORDERS_MODULE_READY = true;

export function useClientOrders(orgId: string | undefined, clientGln: string | undefined) {
  const enabled = ORDERS_MODULE_READY && !!orgId && !!clientGln;
  const path = ordersStoreOrgPath(
    orgId ?? '',
    `/orders?search=${encodeURIComponent(`clientGln:${clientGln ?? ''}`)}&page=1&page_size=24`,
  );

  return useQuery<Order[]>({
    queryKey: ['client-orders', orgId, clientGln],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await ordersStoreApi.get<{ data?: Order[] }>(path);
      return res.data ?? [];
    },
  });
}
