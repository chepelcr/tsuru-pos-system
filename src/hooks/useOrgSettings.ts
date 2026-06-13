import { useMutation, useQueryClient } from "@tanstack/react-query";
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
 * One PUT mutation per category (theme/contact/payment/shipping), plus a PATCH
 * mutation for general (org metadata). There are NO per-section GET queries
 * anymore: the org sub-pages hydrate from the embedded org sections
 * (org.contact / org.branding / org.payment / org.shipping / org.name) returned
 * by the shared org response (GET /memberships/organizations). The write hooks
 * invalidate the org list (["user-organizations", userId]) on success so the
 * embedded section reflects the new values.
 *
 * All HTTP goes through `api` + `orgSettingsPath` (markets-api, singular
 * `/organization/` shape WITHOUT `memberships`). Token is auto-injected.
 *
 * Endpoints VERIFIED against tsuru-platform-api (routes.ts + the four
 * *SettingsController upserts + OrganizationController.updateGeneral):
 *   PUT    /api/users/{u}/organization/{o}/settings/{theme|contact|payment|shipping}
 *   PATCH  /api/users/{u}/organization/{o}/settings/general  (updates the org row:
 *          name/description)
 * Each section is RBAC-gated by the `organization/<section>` submodule
 * (settings/theme maps to `branding` — it stores storefront branding, not the
 * POS shell theme scalar).
 */

export type SettingsCategory = "theme" | "contact" | "payment" | "shipping";

/** PUT /settings/{cat} — theme | contact | payment | shipping. */
function useUpdateOrgSettingsSection<T>(
  cat: SettingsCategory,
  userId?: string,
  orgId?: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: T) =>
      api.put<T>(orgSettingsPath(userId!, orgId!, `/settings/${cat}`), body as unknown),
    // Refresh the org list so the embedded section (org.<cat>) reflows.
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["user-organizations", userId] }),
  });
}

// ─── Per-category public hooks ────────────────────────────────────────────

export const useUpdateThemeBrandingSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgThemeBranding>("theme", userId, orgId);

export const useUpdateContactSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgContactSettings>("contact", userId, orgId);

export const useUpdatePaymentSettings = (userId?: string, orgId?: string) =>
  useUpdateOrgSettingsSection<OrgPaymentSettings>("payment", userId, orgId);

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
    mutationFn: (body: OrgGeneralSettings) =>
      api.patch<OrgGeneralSettings>(
        orgSettingsPath(userId!, orgId!, `/settings/general`),
        body
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["user-organizations", userId] }),
  });
}
