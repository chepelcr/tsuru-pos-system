import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateThemeBrandingSettings } from "@/hooks/useOrgSettings";
import { Icon } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { BrandingSettingsForm } from "@/components/org-settings/BrandingSettingsForm";
import { ROUTES } from "@/routePaths";
import type { OrgThemeBranding } from "@/types";

/**
 * STOREFRONT branding settings (settings.theme) — logo / brand colors / fonts
 * for the PUBLIC customer-facing store. GET hydrate + PUT save.
 *
 * DISTINCT from the POS UI theme (OrgThemePage). This page does NOT touch
 * ThemeContext / useUpdateOrgTheme — it only persists storefront branding.
 */
export default function OrgBrandingPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.branding")]);
  const [, navigate] = useLocation();

  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);

  // Fail-open while my-permissions resolves (RBAC_ENFORCEMENT=log rollout).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "branding");

  const updateMutation = useUpdateThemeBrandingSettings(user?.userId, org?.id);

  const handleSave = async (data: OrgThemeBranding) => {
    setSavedNoticeVisible(false);
    await updateMutation.mutateAsync(data);
    setSavedNoticeVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (orgLoading || !org) {
    const FieldSkeleton = () => (
      <div className="space-y-2">
        <div className="skeleton-block animate-pulse h-3.5 w-28 rounded" />
        <div className="skeleton-block animate-pulse h-10 w-full rounded-md" />
        <div className="skeleton-block animate-pulse h-3 w-3/4 rounded" />
      </div>
    );
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        <div className="mb-6">
          <div className="skeleton-block animate-pulse h-5 w-32 rounded mb-3" />
          <div className="skeleton-block animate-pulse h-7 w-56 rounded mb-2" />
          <div className="skeleton-block animate-pulse h-4 w-80 max-w-full rounded" />
        </div>

        <div className="card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="flex justify-end pt-1">
            <div className="skeleton-block animate-pulse h-9 w-24 rounded-md" />
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
          <h1 className="t-h1 mb-1">{t("orgSettings.branding.title")}</h1>
          <p className="t-body text-muted-foreground">{t("orgSettings.branding.subtitle")}</p>
        </div>

        {savedNoticeVisible && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
            <span className="t-sm">{t("orgSettings.branding.saved")}</span>
          </div>
        )}

        {updateMutation.isError && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <span className="t-sm text-destructive">{t("orgSettings.branding.saveError")}</span>
          </div>
        )}

        <BrandingSettingsForm
          // Seed from the embedded org.branding section — no separate GET. Writes
          // invalidate the org list so this reflows after save.
          initialValues={org.branding ?? undefined}
          onSubmit={handleSave}
          isSaving={updateMutation.isPending}
          canSave={canUpdate}
        />
      </FadeIn>
    </div>
  );
}
