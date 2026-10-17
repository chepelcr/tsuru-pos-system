import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateContactSettings } from "@/hooks/useOrgSettings";
import { Icon, FadeIn } from "@/components/ui";
import { ContactSettingsForm } from "@/components/org-settings/ContactSettingsForm";
import { SettingsDetailCard } from "@/components/org-settings/SettingsDetailCard";
import { SettingsEditDrawer } from "@/components/org-settings/SettingsEditDrawer";
import { OrganizationSettingsSummary } from "@/components/org-settings/OrganizationSettingsSummary";
import type { OrgContactSettings } from "@/types";
import { ROUTES } from "@/routePaths";

export default function OrgContactPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  const canUpdate = can("organization", "update", "contact");
  const update = useUpdateContactSettings(user?.userId, org?.id);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.contact")]);

  const handleSave = async (data: OrgContactSettings) => {
    if (!org || !canUpdate) return;
    try {
      await update.mutateAsync(data);
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
        <h1 className="t-h1 mb-1">{t("orgSettings.contact.title")}</h1>
        <p className="t-body text-muted-foreground">{t("orgSettings.contact.subtitle")}</p>
      </div>
      {saved && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg bg-success/10 border border-success/30 p-3">
        <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
        <span className="t-sm">{t("orgSettings.contact.saved")}</span>
      </div>}
      <SettingsDetailCard title={t("orgSettings.contact.title")} icon="mapPin" configured={!!org.contact}
        onEdit={canUpdate ? () => { update.reset(); setSaved(false); setEditingOrgId(org.id); } : undefined}>
        <OrganizationSettingsSummary section="contact" org={org} />
      </SettingsDetailCard>
    </FadeIn>
    {canUpdate && <SettingsEditDrawer key={org.id} open={editingOrgId === org.id} onClose={() => setEditingOrgId(null)}
      title={t("orgSettings.contact.title")} icon="mapPin" formId="org-contact-edit" isBusy={update.isPending}
      error={update.isError ? t("orgSettings.contact.saveError") : undefined}>
      <ContactSettingsForm formId="org-contact-edit" initialValues={org.contact ?? undefined} isSaving={update.isPending} canSave hideActions onSubmit={handleSave} />
    </SettingsEditDrawer>}
  </div>;
}
