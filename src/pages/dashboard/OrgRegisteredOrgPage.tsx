import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { Icon } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { FiscalInfoStepper } from "@/components/org-settings/registered-org/FiscalInfoStepper";
import { FiscalInfoSummaryCard } from "@/components/org-settings/registered-org/FiscalInfoSummaryCard";
import { FiscalInfoEditDrawer } from "@/components/org-settings/registered-org/FiscalInfoEditDrawer";
import { ROUTES } from "@/routePaths";

export default function OrgRegisteredOrgPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.fiscalInfo")]);
  const [, navigate] = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);

  const { data: reg, isLoading } = useRegisteredOrganization(org?.id);

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
          <h1 className="t-h1 mb-1">{t("orgSettings.tab.fiscalInfo")}</h1>
          <p className="t-body text-muted-foreground">
            {t("orgSettings.fiscalInfo.empty.desc")}
          </p>
        </div>

        {savedNoticeVisible && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
            <span className="t-sm">{t("orgSettings.fiscalInfo.saveSuccess")}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            <div className="skeleton-block h-16 rounded-lg animate-pulse" />
            <div className="skeleton-block h-32 rounded-lg animate-pulse" />
            <div className="skeleton-block h-24 rounded-lg animate-pulse" />
          </div>
        )}

        {/* Empty → stepper */}
        {!isLoading && org && !reg && (
          <FiscalInfoStepper
            orgId={org.id}
            onSaved={() => {
              setSavedNoticeVisible(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {/* Configured → summary card */}
        {!isLoading && org && reg && (
          <FiscalInfoSummaryCard
            reg={reg}
            onEdit={() => setDrawerOpen(true)}
          />
        )}
      </FadeIn>

      {org && (
        <FiscalInfoEditDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          orgId={org.id}
          reg={reg}
        />
      )}
    </div>
  );
}
