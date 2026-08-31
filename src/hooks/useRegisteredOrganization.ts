import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, salesApi, authOrgPath } from "@/lib/api";
import type {
  RegisteredOrganization,
  RegisteredOrganizationPayload,
} from "@/types/registeredOrganization";

/**
 * Hooks for the auth/registered-organizations service. Same API Gateway as the
 * existing org-configurations Lambda (`sales-api.tsuru.jcampos.dev`) — both mounted
 * at the root (`/organizations/{org}/...`) via `authOrgPath`.
 *
 * The GET returns `null` on 404 (no record yet) so the FE can branch between
 * stepper (first-time) and summary card (existing record) without bubbling an
 * error to React Query. The PUT is upsert.
 */

export function useRegisteredOrganization(orgId: string | undefined) {
  return useQuery({
    queryKey: ["registered-organization", orgId],
    enabled: !!orgId,
    // The registered-org rarely changes; cache it so the shared query dedups
    // across OrgContext (wraps the whole dashboard) + the settings pages
    // instead of refetching on every mount/navigation. Mutations still
    // invalidate the key explicitly (useSaveRegisteredOrganization).
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        return await salesApi.get<RegisteredOrganization>(
          authOrgPath(orgId!, "/registered-organization"),
        );
      } catch (error) {
        // 404 means no fiscal info saved yet — treat as empty, not error.
        if (error instanceof ApiError && error.status === 404) return null;
        // Anything else (offline, 5xx) MUST rethrow. Returning null here would
        // resolve the query successfully with "no fiscal info", overwriting the
        // persisted copy — and the POS checkout reads the org's economic
        // activities from it, so the activity_code select would empty out
        // exactly when there is no network to refill it.
        throw error;
      }
    },
  });
}

export function useSaveRegisteredOrganization(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisteredOrganizationPayload) =>
      salesApi.put<RegisteredOrganization>(
        authOrgPath(orgId, "/registered-organization"),
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registered-organization", orgId] });
    },
  });
}
