import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { EmptyState } from "@/components/ui";
import { ROUTES } from "@/routePaths";

/** Hacienda credentials and notification settings require a saved fiscal identity. */
export function FiscalInfoRequired({ orgId, children }: { orgId: string | undefined; children: ReactNode }) {
  const { data: registeredOrg, isLoading } = useRegisteredOrganization(orgId);
  const { can } = usePermissions();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  if (!orgId || isLoading) {
    return <div className="skeleton-block h-32 rounded-lg animate-pulse" />;
  }

  if (!registeredOrg) {
    const canConfigure = can("organization", "read", "fiscal-info") && can("organization", "update", "fiscal-info");
    return (
      <EmptyState
        icon="lock"
        title={t("orgSettings.fiscalInfo.requiredFirst")}
        description={t("orgSettings.fiscalInfo.requiredForSettings")}
        action={canConfigure ? (
          <button className="btn btn-primary" onClick={() => navigate(ROUTES.DASHBOARD_ORG_FISCAL_INFO)}>
            {t("orgSettings.fiscalInfo.configure")}
          </button>
        ) : undefined}
      />
    );
  }

  return <>{children}</>;
}
