import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateGeneralSettings } from "@/hooks/useOrgSettings";
import { Icon, FadeIn } from "@/components/ui";
import { GeneralSettingsForm } from "@/components/org-settings/GeneralSettingsForm";
import { SettingsDetailCard } from "@/components/org-settings/SettingsDetailCard";
import { SettingsEditDrawer } from "@/components/org-settings/SettingsEditDrawer";
import { OrganizationSettingsSummary } from "@/components/org-settings/OrganizationSettingsSummary";
import type { OrgGeneralSettings } from "@/types";
import { ROUTES } from "@/routePaths";
import { HIDEABLE_MODULES, useOrgFeatureVisibility } from "@/store/orgFeatureVisibility";

export default function OrgGeneralPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  const canUpdate = can("organization", "update", "general");
  const update = useUpdateGeneralSettings(user?.userId, org?.id);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.general")]);

  const handleSave = async (data: OrgGeneralSettings, hidden: string[]) => {
    if (!org || !canUpdate) return;
    try {
      await update.mutateAsync(data);
      HIDEABLE_MODULES.forEach((module) => useOrgFeatureVisibility.getState().setHidden(org.id, module, hidden.includes(module)));
      setEditingOrgId(null);
      setSaved(true);
    } catch {
      // Keep the editor and its entered values open; the drawer shows the error.
    }
  };

  if (isLoading || !org) return <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
    <div className="skeleton-block h-8 w-56 max-w-full mb-6 animate-pulse" />
    <div className="skeleton-block h-64 rounded-lg animate-pulse" />
  </div>;

  return <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
    <FadeIn duration={0.3}>
      <div className="mb-6">
        <button className="btn btn-ghost btn-sm !pl-0 mb-3 text-muted-foreground" onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}>
          <Icon name="arrowLeft" size={15} />{t("orgSettings.title")}
        </button>
        <h1 data-tour="organization" className="t-h1 mb-1">{t("orgSettings.general.title")}</h1>
        <p className="t-body text-muted-foreground">{t("orgSettings.general.subtitle")}</p>
      </div>
      {saved && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg bg-success/10 border border-success/30 p-3">
        <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
        <span className="t-sm">{t("orgSettings.general.saved")}</span>
      </div>}
      <SettingsDetailCard title={t("orgSettings.general.title")} icon="settings" configured={true}
        onEdit={canUpdate ? () => { update.reset(); setSaved(false); setEditingOrgId(org.id); } : undefined}>
        <OrganizationSettingsSummary section="general" org={org} />
      </SettingsDetailCard>
    </FadeIn>
    {canUpdate && <SettingsEditDrawer key={org.id} open={editingOrgId === org.id} onClose={() => setEditingOrgId(null)}
      title={t("orgSettings.general.title")} icon="settings" formId="org-general-edit" isBusy={update.isPending || logoUploading}
      error={update.isError ? t("orgSettings.general.saveError") : undefined}>
      <GeneralSettingsForm formId="org-general-edit" org={org} userId={user!.userId} onUploadingChange={setLogoUploading} onSubmit={handleSave} />
    </SettingsEditDrawer>}
  </div>;
}
