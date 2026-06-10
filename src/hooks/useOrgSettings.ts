import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgSettingsPath } from "@/lib/api";
import type {
  OrgThemeBranding,
  OrgContactSettings,
  OrgPaymentSettings,
  OrgShippingSettings,
  OrgGeneralSettings,
} from "@/types";

/**
 * Storefront / org-settings hooks (plan 05).
 *
 * One GET query + one PUT mutation per category (theme/contact/payment/shipping),
 * plus a PATCH mutation for general (org metadata — no GET, hydrated from the org
 * object by the caller).
 *
 * All HTTP goes through `api` + `orgSettingsPath` (markets-api, singular
 * `/organization/` shape WITHOUT `memberships`). Token is auto-injected.
 *
 * TODO(verify-endpoint): confirm markets-api exposes
 *   GET/PUT  /api/users/{u}/organization/{o}/settings/{theme|contact|payment|shipping}
 *   PATCH    /api/users/{u}/organization/{o}/settings/general
 * reachable from the POS Cognito ID token via its API Gateway. The Payment/Shipping
 * PUT routes are described as dashboard "placeholders" — verify the real PUT path +
 * payload before relying on persistence.
 */

export type SettingsCategory = "theme" | "contact" | "payment" | "shipping";

export const SETTINGS_QK = (cat: SettingsCategory, orgId?: string) =>
  ["org-settings", cat, orgId] as const;

/** GET /settings/{cat} — theme | contact | payment | shipping (general has no GET). */
function useOrgSettingsSection<T>(
  cat: SettingsCategory,
  userId?: string,
  orgId?: string
) {
  return useQuery<T>({
    queryKey: SETTINGS_QK(cat, orgId),
    // TODO(verify-endpoint): see file header.
    queryFn: () => api.get<T>(orgSettingsPath(userId!, orgId!, `/settings/${cat}`)),
    enabled: !!userId && !!orgId,
  });
}

/** PUT /settings/{cat} — theme | contact | payment | shipping. */
function useUpdateOrgSettingsSection<T>(
  cat: SettingsCategory,
  userId?: string,
  orgId?: string
) {
  const qc = useQueryClient();
  return useMutation({
    // TODO(verify-endpoint): see file header.
    mutationFn: (body: T) =>
      api.put<T>(orgSettingsPath(userId!, orgId!, `/settings/${cat}`), body as unknown),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_QK(cat, orgId) }),
  });
}

// ─── Per-category public hooks ────────────────────────────────────────────

export const useThemeBrandingSettings = (userId?: string, orgId?: string) =>
  useOrgSettingsSection<OrgThemeBranding>("theme", userId, orgId);
export const useUpdateThemeBrandingSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgThemeBranding>("theme", userId, orgId);

export const useContactSettings = (userId?: string, orgId?: string) =>
  useOrgSettingsSection<OrgContactSettings>("contact", userId, orgId);
export const useUpdateContactSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgContactSettings>("contact", userId, orgId);

export const usePaymentSettings = (userId?: string, orgId?: string) =>
  useOrgSettingsSection<OrgPaymentSettings>("payment", userId, orgId);
export const useUpdatePaymentSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgPaymentSettings>("payment", userId, orgId);

export const useShippingSettings = (userId?: string, orgId?: string) =>
  useOrgSettingsSection<OrgShippingSettings>("shipping", userId, orgId);
export const useUpdateShippingSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgShippingSettings>("shipping", userId, orgId);

/**
 * PATCH /settings/general → updates the Organization row directly.
 * Invalidates the org list so name/email/etc. reflow everywhere (receipts,
 * profile, header). There is NO GET /settings/general — hydrate from the org.
 */
export function useUpdateGeneralSettings(userId?: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    // TODO(verify-endpoint): see file header (dashboard uses PATCH here).
    mutationFn: (body: OrgGeneralSettings) =>
      api.patch<OrgGeneralSettings>(
        orgSettingsPath(userId!, orgId!, `/settings/general`),
        body
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["user-organizations", userId] }),
  });
}
