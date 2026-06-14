import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateContactSettings } from "@/hooks/useOrgSettings";
import { Icon } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { ContactSettingsForm } from "@/components/org-settings/ContactSettingsForm";
import { ROUTES } from "@/routePaths";
import type { OrgContactSettings } from "@/types";

/**
 * Storefront public-contact + social settings. GET hydrate + PUT save.
 */
export default function OrgContactPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.contact")]);
  const [, navigate] = useLocation();

  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);

  // Fail-open while my-permissions resolves (RBAC_ENFORCEMENT=log rollout).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "contact");

  const updateMutation = useUpdateContactSettings(user?.userId, org?.id);

  const handleSave = async (data: OrgContactSettings) => {
    setSavedNoticeVisible(false);
    await updateMutation.mutateAsync(data);
    setSavedNoticeVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (orgLoading || !org) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        {/* Header block: back button + title + subtitle */}
        <div className="mb-6">
          <div className="skeleton-block animate-pulse h-4 w-32 mb-3 rounded" />
          <div className="skeleton-block animate-pulse h-7 w-56 mb-2 rounded" />
          <div className="skeleton-block animate-pulse h-4 w-80 max-w-full rounded" />
        </div>

        {/* Two SectionWrapper cards, each with form fields */}
        <div className="space-y-4">
          {[0, 1].map((section) => (
            <div key={section} className="card p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-muted/40 animate-pulse h-8 w-8 rounded-lg" />
                <div className="skeleton-block animate-pulse h-5 w-40 rounded" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="skeleton-block animate-pulse h-3.5 w-24 mb-2 rounded" />
                    <div className="skeleton-block animate-pulse h-9 w-full rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-1">
          <div className="skeleton-block animate-pulse h-8 w-24 rounded" />
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
          <h1 className="t-h1 mb-1">{t("orgSettings.contact.title")}</h1>
          <p className="t-body text-muted-foreground">{t("orgSettings.contact.subtitle")}</p>
        </div>

        {savedNoticeVisible && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
            <span className="t-sm">{t("orgSettings.contact.saved")}</span>
          </div>
        )}

        {updateMutation.isError && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <span className="t-sm text-destructive">{t("orgSettings.contact.saveError")}</span>
          </div>
        )}

        <ContactSettingsForm
          // Seed from the embedded org.contact section (shared org response
          // contract) — no separate GET. Writes invalidate the org list so this
          // reflows after save.
          initialValues={org.contact ?? undefined}
          onSubmit={handleSave}
          isSaving={updateMutation.isPending}
          canSave={canUpdate}
        />
      </FadeIn>
    </div>
  );
}
