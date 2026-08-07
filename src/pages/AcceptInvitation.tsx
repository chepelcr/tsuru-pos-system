import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ROUTES } from "@/routePaths";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/lib/api";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardBody, Icon, Button, Spinner, Badge } from "@/components/ui";

interface InvitationDetails {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  organization?: { id: string; name: string };
  role?: { id: string; name: string; displayName: string };
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { user, isLoading: authLoading } = useAuthContext();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  usePageTitle([t("members.invitation.pageTitle")]);

  useEffect(() => {
    let cancelled = false;
    const fetchInvitation = async () => {
      if (!token) return;
      try {
        const data = await api.get<InvitationDetails>(
          `/api/invitations/token/${token}`
        );
        if (cancelled) return;
        setInvitation(data);
        if (new Date(data.expiresAt) < new Date()) {
          setError(t("members.invitation.expired"));
        } else if (data.status !== "pending") {
          setError(t("members.invitation.notValid"));
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        setError(
          msg.includes("404")
            ? t("members.invitation.notFound")
            : t("members.invitation.loadError")
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInvitation();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const handleAccept = async () => {
    if (!user?.userId || !token) return;
    setAccepting(true);
    try {
      await api.post(`/api/invitations/accept/${token}`, {
        userId: user.userId,
      });
      setSuccess(true);
      setTimeout(() => navigate(ROUTES.SELECT_ORG), 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("members.invitation.acceptError")
      );
    } finally {
      setAccepting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <AuthLayout>
        <Card>
          <CardBody className="py-16 flex justify-center">
            <Spinner label={t("common.loading")} />
          </CardBody>
        </Card>
      </AuthLayout>
    );
  }

  // ─── Not authenticated ──────────────────────────────────────────────────
  if (!user) {
    return (
      <AuthLayout>
        <Card>
          <CardBody className="text-center py-10 px-8">
            <div className="icon-pill icon-pill-lg icon-pill-primary-soft w-16 h-16 mx-auto mb-5">
              <Icon name="user" size={28} strokeWidth={1.5} />
            </div>
            <h2 className="t-h2 mb-1.5">
              {t("members.invitation.receivedTitle")}
            </h2>
            <p className="t-body text-muted-foreground mb-6">
              {t("members.invitation.loginRequired")}
            </p>
            <div className="flex flex-col gap-2.5">
              <Button
                variant="primary"
                onClick={() =>
                  navigate(`${ROUTES.LOGIN}?redirect=/join/${token}`)
                }
              >
                {t("members.invitation.signIn")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`${ROUTES.REGISTER}?redirect=/join/${token}`)
                }
              >
                {t("members.invitation.createAccount")}
              </Button>
            </div>
          </CardBody>
        </Card>
      </AuthLayout>
    );
  }

  // ─── Error / invalid ──────────────────────────────────────────────────────
  if (error) {
    return (
      <AuthLayout>
        <Card>
          <CardBody className="text-center py-10 px-8">
            <div className="icon-pill icon-pill-lg icon-pill-muted w-16 h-16 mx-auto mb-5 text-destructive">
              <Icon name="xCircle" size={28} strokeWidth={1.5} />
            </div>
            <h2 className="t-h2 mb-1.5">
              {t("members.invitation.invalidTitle")}
            </h2>
            <p className="t-body text-muted-foreground mb-6">{error}</p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(ROUTES.SELECT_ORG)}
            >
              {t("members.invitation.backHome")}
            </Button>
          </CardBody>
        </Card>
      </AuthLayout>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout>
        <Card>
          <CardBody className="text-center py-10 px-8">
            <div className="icon-pill icon-pill-lg icon-pill-success w-16 h-16 mx-auto mb-5">
              <Icon name="checkCircle" size={28} strokeWidth={1.5} />
            </div>
            <h2 className="t-h2 mb-1.5">
              {t("members.invitation.welcomeTitle")}
            </h2>
            <p className="t-body text-muted-foreground">
              {t("members.invitation.redirecting")}
            </p>
          </CardBody>
        </Card>
      </AuthLayout>
    );
  }

  // ─── Invitation details ─────────────────────────────────────────────────
  const emailMismatch =
    user.email?.toLowerCase() !== invitation?.email?.toLowerCase();

  return (
    <AuthLayout>
      <Card>
        <CardBody className="text-center py-10 px-8">
          <div className="icon-pill icon-pill-lg icon-pill-primary-soft w-16 h-16 mx-auto mb-5">
            <Icon name="user" size={28} strokeWidth={1.5} />
          </div>
          <h2 className="t-h2 mb-1.5">
            {t("members.invitation.invitedTitle")}
          </h2>
          <p className="t-body text-muted-foreground mb-6">
            {t("members.invitation.invitedSubtitle")}
          </p>

          <div className="card-surface-muted rounded-md p-4 text-left space-y-3 mb-6">
            <div className="flex justify-between items-center gap-3">
              <span className="t-sm text-muted-foreground">
                {t("common.email")}
              </span>
              <span className="t-sm font-semibold text-foreground truncate">
                {invitation?.email}
              </span>
            </div>
            {invitation?.organization && (
              <div className="flex justify-between items-center gap-3">
                <span className="t-sm text-muted-foreground">
                  {t("members.invitation.organization")}
                </span>
                <span className="t-sm font-semibold text-foreground truncate">
                  {invitation.organization.name}
                </span>
              </div>
            )}
            {invitation?.role && (
              <div className="flex justify-between items-center gap-3">
                <span className="t-sm text-muted-foreground">
                  {t("common.role")}
                </span>
                <Badge variant="primary-soft">
                  {invitation.role.displayName}
                </Badge>
              </div>
            )}
          </div>

          {emailMismatch && (
            <div className="card-muted border border-warning/30 rounded-md px-3 py-2.5 flex items-start gap-2 text-left mb-5">
              <Icon
                name="alertTri"
                size={15}
                className="text-warning mt-0.5 flex-shrink-0"
              />
              <span className="t-sm text-warning">
                {t("members.invitation.wrongEmail", {
                  email: invitation?.email ?? "",
                })}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="w-full"
              icon="check"
              onClick={handleAccept}
              disabled={accepting || emailMismatch}
            >
              {accepting
                ? t("members.invitation.accepting")
                : t("members.invitation.accept")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(ROUTES.SELECT_ORG)}
            >
              {t("members.invitation.decline")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
