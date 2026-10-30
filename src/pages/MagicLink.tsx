import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Button, Spinner } from "@/components/ui";
import { readMagicLink } from "@/lib/passwordless";
import { ROUTES } from "@/routePaths";

/** Landing page of a mailed sign-in link: `/auth/magic#u=…&t=…`. */
export default function MagicLink() {
  const { t } = useLanguage();
  const { signInWithMagicLink } = useAuthContext();
  const [, navigate] = useLocation();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  usePageTitle([t("auth.magicLink.title")]);

  useEffect(() => {
    // StrictMode mounts twice; a link is single-use, so answer it exactly once.
    if (started.current) return;
    started.current = true;
    const link = readMagicLink(window.location.hash);
    // Keep the token out of history and anything that reads the URL later.
    window.history.replaceState(null, "", window.location.pathname);
    if (!link) {
      setFailed(true);
      return;
    }
    signInWithMagicLink(link.username, link.token)
      .then(() => navigate(ROUTES.SELECT_ORG))
      .catch(() => setFailed(true));
  }, [navigate, signInWithMagicLink]);

  return (
    <AuthLayout maxWidthClassName="max-w-md">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="t-h2">{t(failed ? "auth.magicLink.failedTitle" : "auth.magicLink.title")}</CardTitle>
          <CardDescription>{t(failed ? "auth.magicLink.failedDescription" : "auth.magicLink.signingIn")}</CardDescription>
        </CardHeader>
        <CardBody className="flex justify-center">
          {failed ? (
            <Button variant="primary" className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
              {t("auth.magicLink.backToLogin")}
            </Button>
          ) : (
            <Spinner size={24} />
          )}
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
