import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDocumentVersion } from "@/contexts/DocumentVersionContext";
import { useOrganization } from "@/hooks/useOrganization";
import { CountryISO } from "@/lib/enums";
import { isOffline } from "@/lib/offline";
import {
  getOfflineBootstrapState,
  runOfflineBootstrap,
  shouldRunOfflineBootstrap,
  subscribeOfflineBootstrap,
  type OfflineBootstrapState,
} from "@/services/offlineBootstrap";

/**
 * Warms every catalog the app needs offline, once per org per day.
 *
 * Mounted high in the authenticated shell so it runs on the first dashboard
 * paint after login. Three preconditions before it fires:
 *
 *  1. A user and an org — everything it fetches is scoped to them.
 *  2. A resolved `documentVersionId`. Several Hacienda catalogs are versioned
 *     and the client injects that id; warming before it lands would cache the
 *     wrong (unversioned) response under the key the hooks read.
 *  3. Connectivity. Warming up offline would just burn through the step list
 *     failing, so it waits for the `online` event instead.
 */
export interface UseOfflineBootstrapResult extends OfflineBootstrapState {
  /** Force a re-run, ignoring the freshness stamp. */
  refresh: () => void;
}

export function useOfflineBootstrap(): UseOfflineBootstrapResult {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { documentVersionId } = useDocumentVersion();
  const queryClient = useQueryClient();

  const state = useSyncExternalStore(
    subscribeOfflineBootstrap,
    getOfflineBootstrapState,
    getOfflineBootstrapState,
  );

  const orgId = org?.id;
  const userId = user?.userId;
  const ready = !!orgId && !!userId && documentVersionId !== undefined;

  const start = useCallback(
    (force: boolean) => {
      if (!orgId || !userId) return;
      if (isOffline()) return;
      if (!force && !shouldRunOfflineBootstrap(orgId)) return;
      void runOfflineBootstrap({
        queryClient,
        orgId,
        userId,
        isoCode: CountryISO.COSTA_RICA,
      });
    },
    [orgId, userId, queryClient],
  );

  useEffect(() => {
    if (!ready) return;
    start(false);
  }, [ready, start]);

  // Coming back online is the other moment worth warming: the user may have
  // spent the whole session so far with no connection.
  useEffect(() => {
    if (!ready) return;
    const onOnline = () => start(false);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [ready, start]);

  const refresh = useCallback(() => start(true), [start]);

  return { ...state, refresh };
}
