import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { salesApi, userNotificationsPath } from "@/lib/api";
import type { ServerNotification, ServerNotificationPage } from "@/types/notification";

export const notificationsQueryKey = (userId?: string) => ["user-notifications", userId];

/**
 * The notification centre's ONE read.
 *
 * There is deliberately no `refetchInterval` here, and there must never be one.
 * New notifications arrive over AppSync Events (`useRealtimeNotifications`),
 * which writes them straight into this query's cache. Polling would spend a
 * request per user every few seconds to be told nothing happened, and would
 * still be slower than the push.
 *
 * `staleTime: Infinity` says the same thing to React Query: this cache is not
 * kept fresh by re-fetching, it is kept fresh by the server. It is re-fetched
 * exactly twice — on mount, and after a reconnect, to pick up anything that
 * happened while the socket was down.
 */
export function useUserNotifications(enabled = true) {
  const { user } = useAuthContext();
  const userId = user?.userId;

  return useQuery({
    queryKey: notificationsQueryKey(userId),
    enabled: !!userId && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: () =>
      salesApi.get<ServerNotificationPage>(
        userNotificationsPath(userId!, "?page=1&page_size=50"),
        { headers: { "x-user-id": userId! } },
      ),
  });
}

/**
 * Mark one notification read, or all of them.
 *
 * Read state is a user ACTION, not something the server pushes — so it is a
 * plain mutation with an optimistic cache write. The badge has to drop the
 * instant the row is clicked; waiting for a round trip to un-bold something the
 * user just read reads as lag.
 */
export function useNotificationMutations() {
  const { user } = useAuthContext();
  const userId = user?.userId;
  const qc = useQueryClient();

  const patchCache = (fn: (page: ServerNotificationPage) => ServerNotificationPage) => {
    qc.setQueryData<ServerNotificationPage>(notificationsQueryKey(userId), (prev) =>
      prev ? fn(prev) : prev,
    );
  };

  const markRead = useMutation({
    mutationFn: (id: string) =>
      salesApi.patch<{ updated: boolean; unread_count: number }>(
        userNotificationsPath(userId!, `/${id}/read`),
        undefined,
        { headers: { "x-user-id": userId! } },
      ),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: notificationsQueryKey(userId) });
      const previous = qc.getQueryData<ServerNotificationPage>(notificationsQueryKey(userId));
      patchCache((page) => ({
        ...page,
        data: page.data.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unread_count: Math.max(0, page.unread_count - (page.data.find((n) => n.id === id && !n.is_read) ? 1 : 0)),
      }));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      // Put the badge back rather than leaving the user believing they have
      // read something the server still considers unread.
      if (ctx?.previous) qc.setQueryData(notificationsQueryKey(userId), ctx.previous);
    },
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      salesApi.post<{ updated: number; unread_count: number }>(
        userNotificationsPath(userId!, "/read-all"),
        undefined,
        { headers: { "x-user-id": userId! } },
      ),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationsQueryKey(userId) });
      const previous = qc.getQueryData<ServerNotificationPage>(notificationsQueryKey(userId));
      patchCache((page) => ({
        ...page,
        data: page.data.map((n) => ({ ...n, is_read: true })),
        unread_count: 0,
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(notificationsQueryKey(userId), ctx.previous);
    },
  });

  /**
   * Insert a pushed notification into the hydrated list.
   *
   * Keyed by `id` and deduped, because the same notification can legitimately
   * arrive twice: once in the hydrate response and once over the socket, when
   * it is created in the window between the fetch and the subscription being
   * established.
   */
  const receive = (incoming: ServerNotification) => {
    qc.setQueryData<ServerNotificationPage>(notificationsQueryKey(userId), (prev) => {
      if (prev?.data.some((n) => n.id === incoming.id)) return prev;
      const total = (prev?.pagination.total_elements ?? 0) + 1;
      return {
        data: [incoming, ...(prev?.data ?? [])],
        unread_count: (prev?.unread_count ?? 0) + (incoming.is_read ? 0 : 1),
        pagination: { page: 1, page_size: 50, total_pages: Math.ceil(total / 50), ...prev?.pagination, total_elements: total },
      };
    });
    const saleId = incoming.payload?.sale_id;
    const organizationId = incoming.organization_id;
    if (typeof saleId === 'string' && incoming.event_type.startsWith('document.')) {
      void qc.invalidateQueries({ queryKey: ['sale', organizationId, saleId] });
      void qc.invalidateQueries({ queryKey: ['sales', organizationId] });
      const orderNumber = incoming.payload?.order_document_number;
      if (typeof orderNumber === 'string') {
        void qc.invalidateQueries({ queryKey: ['order', organizationId, orderNumber] });
        void qc.invalidateQueries({ queryKey: ['orders', organizationId] });
      }
    }
  };

  const rehydrate = () => qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) });

  return { markRead, markAllRead, receive, rehydrate };
}
