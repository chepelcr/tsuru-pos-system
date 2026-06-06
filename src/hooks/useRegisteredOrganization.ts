import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi, authOrgPath } from "@/lib/api";
import type {
  RegisteredOrganization,
  RegisteredOrganizationPayload,
} from "@/types/registeredOrganization";

/**
 * Hooks for the auth/registered-organizations service. Same API Gateway as the
 * existing org-configurations Lambda (`sales-api.jcampos.dev`) — both mounted
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
    queryFn: async () => {
      try {
        return await salesApi.get<RegisteredOrganization>(
          authOrgPath(orgId!, "/registered-organization"),
        );
      } catch {
        // 404 means no fiscal info saved yet — treat as empty, not error.
        return null;
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
