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
import { NotificationsTab } from "@/components/org-settings/tabs/NotificationsTab";
import { NotificationsDrawer } from "@/components/org-settings/NotificationsDrawer";
import { ROUTES } from "@/routePaths";

export default function OrgNotificationsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.notifications")]);
  const [, navigate] = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: config, isLoading } = useOrgConfigurations(org?.id);

  // Edit triggers + save drawer gate on organization/update/notifications.
  // Fail-open while my-permissions resolves (RBAC_ENFORCEMENT=log rollout).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "notifications");

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
          <h1 className="t-h1 mb-1">{t("orgSettings.tab.notifications")}</h1>
          <p className="t-body text-muted-foreground">{t("orgSettings.notifications.empty.desc")}</p>
        </div>

        <NotificationsTab
          config={config}
          isLoading={isLoading}
          onEdit={canUpdate ? () => setDrawerOpen(true) : undefined}
        />
      </FadeIn>

      {org && canUpdate && (
        <NotificationsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          config={config}
          orgId={org.id}
        />
      )}
    </div>
  );
}
