import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi, authOrgPath } from "@/lib/api";
import type {
  OrgConfiguration,
  ValidateCredentialsResponse,
  NotificationsFormState,
} from "@/types/orgConfigurations";

/**
 * Hooks for the auth/organization-configurations service. The Lambda is hosted
 * on the same API Gateway as sales-api (`sales-api.jcampos.dev`) but mounted
 * at `/organizations/{org}/...` — see `authOrgPath` in `lib/api.ts`. Calling
 * the orders-api here (the previous shape) would 404 because the route only
 * exists on the sales-api gateway.
 */

export function useOrgConfigurations(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org-configurations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      try {
        return await salesApi.get<OrgConfiguration>(authOrgPath(orgId!, "/configurations"));
      } catch {
        // 404 means no configuration saved yet — treat as empty, not error
        return null;
      }
    },
  });
}

export function useValidateCredentials(orgId: string) {
  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      salesApi.post<ValidateCredentialsResponse>(authOrgPath(orgId, "/credentials"), data),
  });
}

export function useSaveOrgConfigurations(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      salesApi.put<OrgConfiguration>(authOrgPath(orgId, "/configurations"), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-configurations", orgId] });
    },
  });
}

export function useSaveNotifications(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationsFormState) =>
      salesApi.patch<OrgConfiguration>(authOrgPath(orgId, "/configurations/notifications"), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-configurations", orgId] });
    },
  });
}
