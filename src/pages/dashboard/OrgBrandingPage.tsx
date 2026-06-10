import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useThemeBrandingSettings,
  useUpdateThemeBrandingSettings,
} from "@/hooks/useOrgSettings";
import { Icon, Spinner } from "@/components/ui";
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

  const { data: branding, isLoading: brandingLoading } = useThemeBrandingSettings(
    user?.userId,
    org?.id
  );
  const updateMutation = useUpdateThemeBrandingSettings(user?.userId, org?.id);

  const handleSave = async (data: OrgThemeBranding) => {
    setSavedNoticeVisible(false);
    await updateMutation.mutateAsync(data);
    setSavedNoticeVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (orgLoading || !org) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
        <div className="text-center text-muted-foreground">
          <Spinner size={28} />
          <p className="t-sm mt-3">{t("common.loading")}</p>
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

        {brandingLoading ? (
          <div className="card p-5">
            <div className="skeleton-block h-40 w-full rounded-lg animate-pulse" />
          </div>
        ) : (
          <BrandingSettingsForm
            initialValues={branding ?? undefined}
            onSubmit={handleSave}
            isSaving={updateMutation.isPending}
          />
        )}
      </FadeIn>
    </div>
  );
}
