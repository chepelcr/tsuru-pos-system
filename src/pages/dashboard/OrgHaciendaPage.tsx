import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOrgConfigurations } from "@/hooks/useOrgConfigurations";
import { Icon } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { HaciendaTab } from "@/components/org-settings/tabs/HaciendaTab";
import { HaciendaConfigDrawer } from "@/components/org-settings/HaciendaConfigDrawer";
import { HaciendaCredentialsStepper } from "@/components/org-settings/hacienda/HaciendaCredentialsStepper";
import { ROUTES } from "@/routePaths";

export default function OrgHaciendaPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.hacienda")]);
  const [, navigate] = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);

  const { data: config, isLoading } = useOrgConfigurations(org?.id);

  // The stepper, edit triggers and drawer are all write surfaces; gate them on
  // organization/update/hacienda. Fail-open while my-permissions resolves
  // (RBAC_ENFORCEMENT=log rollout).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "hacienda");

  // First-time setup branch: render the stepper. Once a config exists we swap
  // to the existing summary tab + edit drawer, unchanged.
  const showStepper = !isLoading && config === null;

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      <FadeIn duration={0.3}>
        {/* Back + header */}
        <div className="mb-6">
          <button
            className="btn btn-ghost btn-sm !pl-0 mb-3 text-muted-foreground"
            onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}
          >
            <Icon name="arrowLeft" size={15} />
            {t("orgSettings.title")}
          </button>
          <h1 className="t-h1 mb-1">{t("orgSettings.tab.hacienda")}</h1>
          <p className="t-body text-muted-foreground">
            {t("orgSettings.hacienda.empty.desc")}
          </p>
        </div>

        {savedNoticeVisible && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
            <span className="t-sm">{t("orgSettings.fiscalInfo.saveSuccess")}</span>
          </div>
        )}

        {showStepper && org && canUpdate ? (
          <HaciendaCredentialsStepper
            orgId={org.id}
            onSaved={() => {
              setSavedNoticeVisible(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : (
          <HaciendaTab
            config={config}
            isLoading={isLoading}
            onEdit={canUpdate ? () => setDrawerOpen(true) : undefined}
          />
        )}
      </FadeIn>

      {org && canUpdate && (
        <HaciendaConfigDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          config={config}
          orgId={org.id}
        />
      )}
    </div>
  );
}
