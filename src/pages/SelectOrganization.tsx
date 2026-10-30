import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization, type PendingInvitation } from "@/hooks/useOrganization";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ROUTES } from "@/routePaths";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { Button, Icon, Spinner } from "@/components/ui";
import { getSelectedOrgId, setSelectedOrgId } from "@/lib/selectedOrg";

/**
 * Where every sign-in lands, and where "switch organization" in the profile
 * menu leads. Invitations come first: a user with no organization only goes
 * straight to org creation when nobody has invited them anywhere. Belonging to
 * someone else's organization never blocks creating one's own from here.
 */
export default function SelectOrganization() {
  const { user } = useAuthContext();
  const { useUserOrganizations, usePendingInvitations, acceptInvitation } = useOrganization();
  const { data: orgs = [], isLoading, error } = useUserOrganizations(user?.userId);
  // An invitation lookup that fails must not trap the user: treat it as none.
  const invitationsQuery = usePendingInvitations(user?.userId);
  const invitations = invitationsQuery.data ?? [];
  const invitationsLoading = invitationsQuery.isLoading;
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState(false);
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  usePageTitle([t("pageTitle.selectOrg")]);

  const isIncomplete = (org: { onboarding_step?: number }) =>
    (org.onboarding_step ?? 3) < 3;

  const enter = (orgId: string) => {
    setSelectedOrgId(orgId);
    navigate(user?.role === "cajero" ? "/pos" : ROUTES.DASHBOARD);
  };

  useEffect(() => {
    if (isLoading || invitationsLoading || invitations.length > 0) return;
    if (!error && orgs.length === 0) {
      sessionStorage.removeItem("resumeOrgId");
      navigate(ROUTES.CREATE_ORG);
      return;
    }
    // Auto-enter only when the single org is fully onboarded.
    if (orgs.length === 1 && !isIncomplete(orgs[0]) && !getSelectedOrgId()) {
      enter(orgs[0].id);
    }
  }, [isLoading, invitationsLoading, invitations.length, error, orgs, user?.role, navigate]);

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
    enter(org.id);
  };

  const handleAccept = async (invitation: PendingInvitation) => {
    if (!user?.userId || acceptingId) return;
    setAcceptingId(invitation.id);
    setAcceptError(false);
    try {
      await acceptInvitation.mutateAsync({ token: invitation.token, userId: user.userId });
      enter(invitation.organization_id);
    } catch {
      setAcceptError(true);
      setAcceptingId(null);
    }
  };

  if (isLoading || invitationsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthNavbar />
        <div className="t-body text-muted-foreground animate-pulse">
          {t("orgs.loading")}
        </div>
      </div>
    );
  }

  const invitationList = invitations.length > 0 && (
    <section className="flex flex-col gap-3" aria-labelledby="pending-invitations-title">
      <h2 id="pending-invitations-title" className="label-section">{t("orgs.invitations.title")}</h2>
      {invitations.map((invitation) => (
        <div key={invitation.id} className="card w-full px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="t-h4 !mb-0 truncate">{invitation.organization_name}</div>
            <div className="t-xs text-muted-foreground mt-0.5 truncate">
              {[
                invitation.role_display_name && t("orgs.invitations.role", { role: invitation.role_display_name }),
                invitation.invited_by_name && t("orgs.invitations.invitedBy", { name: invitation.invited_by_name }),
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="flex-shrink-0"
            disabled={acceptingId !== null}
            onClick={() => { void handleAccept(invitation); }}
          >
            {acceptingId === invitation.id && <Spinner size={14} />}
            {t("orgs.invitations.accept")}
          </Button>
        </div>
      ))}
      {acceptError && (
        <p className="t-sm text-destructive" role="alert">{t("orgs.invitations.acceptError")}</p>
      )}
    </section>
  );

  // No organization yet, but invited: the invitation comes before creation.
  if (orgs.length === 0 && invitations.length > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <AuthNavbar />
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="icon-pill icon-pill-primary-soft w-12 h-12 mx-auto mb-3">
              <Icon name="mail" size={24} />
            </span>
            <h1 className="t-h2 text-foreground mb-1">{t("orgs.invitations.welcomeTitle")}</h1>
            <p className="t-sm text-muted-foreground">{t("orgs.invitations.welcomeSubtitle")}</p>
          </div>
          {invitationList}
          <div className="mt-6">
            <Button variant="outline" icon="plus" className="w-full" disabled={acceptingId !== null} onClick={goToCreate}>
              {t("orgs.invitations.createOwn")}
            </Button>
          </div>
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

        {invitationList && <div className="mb-6">{invitationList}</div>}

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
                      : org.template_id || `${org.slug}.`}
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
          {/* Members of someone else's organization can still create their own. */}
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
