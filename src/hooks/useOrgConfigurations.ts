import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, salesApi, authOrgPath } from "@/lib/api";
import type {
  CertificateDownload,
  OrgConfiguration,
  ValidateCredentialsResponse,
  NotificationsFormState,
} from "@/types/orgConfigurations";

/**
 * Hooks for the auth/organization-configurations service. The Lambda is hosted
 * on the same API Gateway as sales-api (`sales-api.tsuru.jcampos.dev`) but mounted
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
      } catch (error) {
        // 404 means no configuration saved yet — treat as empty, not error.
        if (error instanceof ApiError && error.status === 404) return null;
        // Offline / 5xx must rethrow: a successful `null` would tell
        // `useFiscalMode` the org has no credentials, which would wrongly
        // report a registered taxpayer as unable to transmit.
        throw error;
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

/**
 * Download the organization's own signing certificate.
 *
 * A mutation rather than a query on purpose: this is the PKCS12 file, so it is
 * fetched only when somebody clicks, never cached, and never loaded alongside
 * the settings screen. The PIN does not come with it — knowing the PIN for your
 * own certificate is what makes the file usable.
 */
export function useDownloadCertificate(orgId: string) {
  return useMutation({
    mutationFn: () =>
      salesApi.get<CertificateDownload>(authOrgPath(orgId, "/configurations/certificate")),
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
    // The hook is the seam between UI state and the wire. `NotificationsFormState`
    // is camelCase because it is form state; `NotificationSettingsRequest` is
    // snake_case because that is what the API speaks. Passing the form straight
    // through used to work only because the DTO declared camelCase aliases —
    // with those gone the fields would be dropped silently and the save would
    // write defaults over the user's settings.
    mutationFn: (data: NotificationsFormState) =>
      salesApi.patch<OrgConfiguration>(authOrgPath(orgId, "/configurations/notifications"), {
        callback_url: data.callbackUrl,
        notify_sent_documents: data.notifySentDocuments,
        notify_processing_documents: data.notifyProcessingDocuments,
        notify_received_documents: data.notifyReceivedDocuments,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-configurations", orgId] });
    },
  });
}
