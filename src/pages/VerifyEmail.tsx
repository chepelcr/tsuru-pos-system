import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Button, Icon, Spinner } from "@/components/ui";
import { OtpInput } from "@/components/ui/OtpInput";
import { FormField } from "@/components/forms/FormField";
import { ROUTES } from "@/routePaths";

const RESEND_COOLDOWN_SECONDS = 60;

const MACRO_STEPS: StepperStep[] = [
  { id: "register", titleKey: "auth.register.steps.personalInfo" },
  { id: "verify", titleKey: "auth.register.steps.verify" },
  { id: "organization", titleKey: "auth.register.steps.organization" },
];

export default function VerifyEmail() {
  const {
    confirmSignUp,
    completeAutoSignIn,
    getCurrentUser,
    completeVerification,
    resendSignUpCode,
  } = useAuthContext();
  const { t } = useLanguage();
  const { add } = useNotifications();
  const [, navigate] = useLocation();

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  usePageTitle([t("auth.verifyEmail.title")]);

  // Guard: require a stashed verification email, else send the user to register.
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("verificationEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      // Remove credentials left by versions prior to the secure auto-sign-in flow.
      sessionStorage.removeItem("verificationPassword");
    } else {
      navigate(ROUTES.REGISTER);
    }
  }, [navigate]);

  // Resend cooldown timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      add({
        source: "fe",
        level: "destructive",
        titleKey: "auth.verifyEmail.invalidCode",
        bodyKey: "auth.verifyEmail.invalidCodeDescription",
      });
      return;
    }

    setVerifying(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });

      const verificationOrigin = sessionStorage.getItem("verificationOrigin");
      let signedIn = false;
      if (verificationOrigin === "register") {
        try {
          signedIn = await completeAutoSignIn();
        } catch {
          // Confirmation succeeded; normal login remains a safe fallback.
          signedIn = false;
        }
      }

      if (signedIn) {
        const amplifyUser = await getCurrentUser();

        const username = sessionStorage.getItem("verificationUsername") || email;
        const firstName = sessionStorage.getItem("verificationFirstName") || "";
        const lastName = sessionStorage.getItem("verificationLastName") || "";

        await completeVerification({
          userId: amplifyUser.userId,
          email,
          username,
          firstName,
          lastName,
        });
      }

      sessionStorage.removeItem("verificationEmail");
      sessionStorage.removeItem("verificationPassword");
      sessionStorage.removeItem("verificationOrigin");
      sessionStorage.removeItem("verificationUsername");
      sessionStorage.removeItem("verificationFirstName");
      sessionStorage.removeItem("verificationLastName");
      sessionStorage.removeItem("verificationGender");
      sessionStorage.removeItem("verificationGenderOther");

      add({
        source: "fe",
        level: "info",
        titleKey: "auth.verifyEmail.success",
        bodyKey: "auth.verifyEmail.successDescription",
      });

      navigate(signedIn ? ROUTES.CREATE_ORG : ROUTES.LOGIN);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.verifyEmail.error");
      const name = (error as { name?: string })?.name ?? "";

      if (name === "CodeMismatchException" || message.includes("CodeMismatchException")) {
        add({
          source: "fe",
          level: "destructive",
          titleKey: "auth.verifyEmail.incorrectCode",
          bodyKey: "auth.verifyEmail.incorrectCodeDescription",
        });
        return;
      }

      if (name === "ExpiredCodeException" || message.includes("ExpiredCodeException")) {
        add({
          source: "fe",
          level: "destructive",
          titleKey: "auth.verifyEmail.expiredCode",
          bodyKey: "auth.verifyEmail.expiredCodeDescription",
        });
        return;
      }

      add({ source: "fe", level: "destructive", titleKey: "auth.verifyEmail.error", bodyKey: message });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await resendSignUpCode({ username: email });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      add({
        source: "fe",
        level: "info",
        titleKey: "auth.verifyEmail.resendSuccess",
        bodyKey: "auth.verifyEmail.resendSuccessDescription",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.verifyEmail.resendErrorDescription");
      add({ source: "fe", level: "destructive", titleKey: "auth.verifyEmail.resendError", bodyKey: message });
    } finally {
      setResending(false);
    }
  };

  const isBusy = verifying;

  return (
    <AuthLayout maxWidthClassName="max-w-md">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 icon-pill icon-pill-lg icon-pill-primary-soft">
            <Icon name="lock" size={24} />
          </div>
          <CardTitle className="t-h2">{t("auth.verifyEmail.title")}</CardTitle>
          <CardDescription>
            {t("auth.verifyEmail.subtitle")} <span className="font-medium text-primary">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardBody>
          <Stepper steps={MACRO_STEPS} current={1} hideFooter>
            <div className="flex flex-col gap-5">
              <FormField label={t("auth.verifyEmail.code")}>
                <OtpInput value={code} onChange={setCode} autoFocus disabled={isBusy} />
              </FormField>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleVerify}
                disabled={isBusy || code.length !== 6}
              >
                {isBusy && <Spinner size={16} />}
                {isBusy ? t("auth.verifyEmail.submitting") : t("auth.verifyEmail.submit")}
              </Button>

              <div className="text-center flex flex-col gap-2">
                <p className="t-sm text-muted-foreground">{t("auth.verifyEmail.didntReceive")}</p>
                <Button
                  variant="outline"
                  className="mx-auto"
                  onClick={handleResendCode}
                  disabled={resending || cooldown > 0}
                >
                  <Icon name="refresh" size={16} className={resending ? "animate-spin" : undefined} />
                  {resending
                    ? t("auth.verifyEmail.resending")
                    : cooldown > 0
                      ? t("auth.verifyEmail.resendCooldown", { seconds: cooldown })
                      : t("auth.verifyEmail.resendCode")}
                </Button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-primary font-medium hover:underline t-sm"
                  onClick={() => navigate(ROUTES.REGISTER)}
                >
                  {t("auth.verifyEmail.backToRegister")}
                </button>
              </div>
            </div>
          </Stepper>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
