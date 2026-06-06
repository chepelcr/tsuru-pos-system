import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthNavbar } from "@/components/layout/AuthNavbar";

export default function SelectOrganization() {
  const { user } = useAuthContext();
  const { useUserOrganizations } = useOrganization();
  const { data: orgs = [], isLoading, error } = useUserOrganizations(user?.userId);
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  usePageTitle([t("pageTitle.selectOrg")]);

  useEffect(() => {
    if (!isLoading && orgs.length === 1 && !sessionStorage.getItem('selectedOrgId')) {
      sessionStorage.setItem("selectedOrgId", orgs[0].id);
      const role = user?.role;
      const targetPath = role === "cajero" ? "/pos" : "/dashboard";
      navigate(targetPath);
    }
  }, [isLoading, orgs, user?.role, navigate]);

  const handleSelect = (org: { id: string; name: string; templateName?: string }) => {
    sessionStorage.setItem("selectedOrgId", org.id);
    const role = user?.role;
    navigate(role === "cajero" ? "/pos" : "/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthNavbar />
        <div className="text-muted font-barlow text-lg animate-pulse">{t("orgs.loading")}</div>
      </div>
    );
  }

  if (error || orgs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <AuthNavbar />
        <div className="text-4xl">⚠️</div>
        <div className="text-destructive font-barlow font-bold text-xl text-center">
          {t("orgs.noOrgs")}
        </div>
        <div className="text-muted text-sm text-center">
          {t("orgs.contactAdmin")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <AuthNavbar />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏢</div>
          <h1 className="font-barlow font-extrabold text-2xl text-foreground">
            {t("orgs.selectTitle")}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org)}
              className="w-full px-5 py-4 bg-surface border border-surface-border rounded-xl text-left hover:border-primary transition-colors group"
            >
              <div className="font-barlow font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {org.name}
              </div>
              <div className="text-muted text-xs mt-0.5">{org.template_name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
