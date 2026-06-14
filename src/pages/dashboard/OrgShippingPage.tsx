import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateShippingSettings } from "@/hooks/useOrgSettings";
import { Icon } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ShippingSettingsForm } from "@/components/org-settings/ShippingSettingsForm";
import { ROUTES } from "@/routePaths";
import type { OrgShippingSettings } from "@/types";

/**
 * Storefront delivery settings. GET hydrate + PUT save.
 *
 * Endpoint verified: PUT /settings/shipping (ShippingSettingsController
 * upsert on tsuru-platform-api; shipping_settings table — threshold, default
 * cost, local pickup / Correos / Uber Flash toggles).
 */
export default function OrgShippingPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.shipping")]);
  const [, navigate] = useLocation();

  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);

  // Fail-open while my-permissions resolves (RBAC_ENFORCEMENT=log rollout).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "shipping");

  const updateMutation = useUpdateShippingSettings(user?.userId, org?.id);

  const handleSave = async (data: OrgShippingSettings) => {
    setSavedNoticeVisible(false);
    await updateMutation.mutateAsync(data);
    setSavedNoticeVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (orgLoading || !org) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        <div className="mb-6">
          <div className="skeleton-block animate-pulse h-7 w-44 mb-3 rounded-md" />
          <div className="skeleton-block animate-pulse h-8 w-64 mb-2 rounded-md" />
          <div className="skeleton-block animate-pulse h-4 w-80 rounded" />
        </div>

        <div className="card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i}>
                <div className="skeleton-block animate-pulse h-4 w-32 mb-2 rounded" />
                <div className="skeleton-block animate-pulse h-10 w-full rounded-md" />
                <div className="skeleton-block animate-pulse h-3 w-40 mt-1.5 rounded" />
              </div>
            ))}
          </div>

          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-4">
              <div className="bg-muted/40 animate-pulse h-4 w-4 mt-0.5 flex-shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <div className="skeleton-block animate-pulse h-4 w-48 rounded" />
                <div className="skeleton-block animate-pulse h-3 w-64 mt-1.5 rounded" />
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-1">
            <div className="skeleton-block animate-pulse h-8 w-24 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      <FadeIn duration={0.3}>
        <div className="mb-6">
          <button
            className="btn btn-ghost btn-sm !pl-0 mb-3 text-muted-foreground"
            onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}
          >
            <Icon name="arrowLeft" size={15} />
            {t("orgSettings.title")}
          </button>
          <h1 className="t-h1 mb-1">{t("orgSettings.shipping.title")}</h1>
          <p className="t-body text-muted-foreground">{t("orgSettings.shipping.subtitle")}</p>
        </div>

        {savedNoticeVisible && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
            <span className="t-sm">{t("orgSettings.shipping.saved")}</span>
          </div>
        )}

        {updateMutation.isError && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <span className="t-sm text-destructive">{t("orgSettings.shipping.saveError")}</span>
          </div>
        )}

        <ShippingSettingsForm
          // Seed from the embedded org.shipping section — no separate GET. Writes
          // invalidate the org list so this reflows after save.
          initialValues={org.shipping ?? undefined}
          onSubmit={handleSave}
          isSaving={updateMutation.isPending}
          canSave={canUpdate}
        />
      </FadeIn>
    </div>
  );
}
