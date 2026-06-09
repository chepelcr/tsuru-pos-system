import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ROUTES } from "@/routePaths";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { Button, Icon } from "@/components/ui";

export default function SelectOrganization() {
  const { user } = useAuthContext();
  const { useUserOrganizations } = useOrganization();
  const { data: orgs = [], isLoading, error } = useUserOrganizations(user?.userId);
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  usePageTitle([t("pageTitle.selectOrg")]);

  const isIncomplete = (org: { onboarding_step?: number }) =>
    (org.onboarding_step ?? 3) < 3;

  useEffect(() => {
    // Auto-enter only when the single org is fully onboarded.
    if (
      !isLoading &&
      orgs.length === 1 &&
      !isIncomplete(orgs[0]) &&
      !sessionStorage.getItem("selectedOrgId")
    ) {
      sessionStorage.setItem("selectedOrgId", orgs[0].id);
      const role = user?.role;
      navigate(role === "cajero" ? "/pos" : ROUTES.DASHBOARD);
    }
  }, [isLoading, orgs, user?.role, navigate]);

  const goToCreate = () => {
    sessionStorage.removeItem("resumeOrgId");
    navigate(ROUTES.CREATE_ORG);
  };

  const handleSelect = (org: { id: string; onboarding_step?: number }) => {
    if (isIncomplete(org)) {
      // Resume the onboarding wizard for a draft org.
      sessionStorage.setItem("resumeOrgId", org.id);
      navigate(ROUTES.CREATE_ORG);
      return;
    }
    sessionStorage.setItem("selectedOrgId", org.id);
    const role = user?.role;
    navigate(role === "cajero" ? "/pos" : ROUTES.DASHBOARD);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthNavbar />
        <div className="t-body text-muted-foreground animate-pulse">
          {t("orgs.loading")}
        </div>
      </div>
    );
  }

  // No orgs (or failed to load): offer to create the first one.
  if (error || orgs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 p-6">
        <AuthNavbar />
        <span className="icon-pill icon-pill-primary-soft w-14 h-14">
          <Icon name="store" size={28} />
        </span>
        <div className="text-center">
          <h1 className="t-h2 mb-1">{t("orgs.empty.title")}</h1>
          <p className="t-sm text-muted-foreground">{t("orgs.empty.subtitle")}</p>
        </div>
        <Button variant="primary" icon="plus" onClick={goToCreate}>
          {t("orgs.create.cta")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <AuthNavbar />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="icon-pill icon-pill-primary-soft w-12 h-12 mx-auto mb-3">
            <Icon name="store" size={24} />
          </span>
          <h1 className="t-h2 text-foreground">{t("orgs.selectTitle")}</h1>
        </div>

        <div className="flex flex-col gap-3">
          {orgs.map((org) => {
            const incomplete = isIncomplete(org);
            return (
              <button
                key={org.id}
                onClick={() => handleSelect(org)}
                className="card card-hover w-full px-5 py-4 text-left group flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="t-h4 !mb-0 truncate group-hover:text-primary transition-colors">
                    {org.name}
                  </div>
                  <div className="t-xs text-muted-foreground mt-0.5 truncate">
                    {incomplete
                      ? t("orgs.continueSetup")
                      : org.template_name || `${org.slug}.`}
                  </div>
                </div>
                {incomplete ? (
                  <span className="badge-mini badge-mini-warning flex-shrink-0">
                    {t("orgs.draft")}
                  </span>
                ) : (
                  <Icon
                    name="chevronRight"
                    size={18}
                    className="text-muted-foreground flex-shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            icon="plus"
            className="w-full"
            onClick={goToCreate}
          >
            {t("orgs.create.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
