import { recordVerificationCodeSent, verificationCooldownSeconds } from "@/lib/verificationCooldown";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Stepper } from "@/components/common/Stepper";
import { AuthErrorAlert } from "@/components/common/AuthErrorAlert";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Button, Icon, Spinner } from "@/components/ui";
import { OtpInput } from "@/components/ui/OtpInput";
import { FormField } from "@/components/forms/FormField";
import { describeAuthError, type AuthErrorInfo } from "@/lib/authErrors";
import { ROUTES } from "@/routePaths";
import { ACCOUNT_CREATION_STEPS } from "@/lib/accountCreationSteps";

export default function VerifyEmail() {
  const {
    confirmSignUp,
    logout,
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
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [signedInAfterConfirmation, setSignedInAfterConfirmation] = useState(false);
  const [resendSucceeded, setResendSucceeded] = useState(false);
  const operationInFlight = useRef(false);

  usePageTitle([t("auth.verifyEmail.title")]);

  // Guard: require a stashed verification email, else send the user to register.
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("verificationEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      setCooldown(verificationCooldownSeconds(storedEmail));
      // Remove credentials left by versions prior to the secure auto-sign-in flow.
      sessionStorage.removeItem("verificationPassword");
    } else {
      navigate(ROUTES.REGISTER);
    }
  }, [navigate]);

  // Resend cooldown timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown(verificationCooldownSeconds(email)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown, email]);

  const handleVerify = async (verificationCode = code) => {
    if (operationInFlight.current || resending || !email) return;
    if (!confirmed && !/^\d{6}$/.test(verificationCode)) {
      setAuthError({
        messageKey: "auth.verifyEmail.invalidCodeDescription",
        name: "",
        action: null,
      });
      add({
        source: "fe",
        level: "destructive",
        titleKey: "auth.verifyEmail.invalidCode",
        bodyKey: "auth.verifyEmail.invalidCodeDescription",
      });
      return;
    }

    operationInFlight.current = true;
    setVerifying(true);
    setAuthError(null);
    let confirmationSucceeded = confirmed;
    try {
      // Confirmation also opens the session (no password kept anywhere), so a
      // reload on this step no longer sends the user back to the login page.
      let signedIn = signedInAfterConfirmation;
      if (!confirmed) {
        ({ signedIn } = await confirmSignUp({ username: email, confirmationCode: verificationCode }));
        setConfirmed(true);
        setSignedInAfterConfirmation(signedIn);
        confirmationSucceeded = true;
      }

      const verificationOrigin = sessionStorage.getItem("verificationOrigin");

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

      navigate(signedIn ? (verificationOrigin === "register" ? ROUTES.CREATE_ORG : ROUTES.SELECT_ORG) : ROUTES.LOGIN);
    } catch (error: unknown) {
      // Was three hand-rolled name checks plus a raw-message fallback, all sent
      // to a bell this layout does not render (TSR-309). describeAuthError knows
      // the same two code errors and every other Cognito case besides.
      const info = confirmationSucceeded
        ? { messageKey: "auth.verifyEmail.syncError", name: "", action: null }
        : describeAuthError(error, "auth.verifyEmail.error");
      setAuthError(info);
      add({
        source: "fe",
        level: "destructive",
        titleKey: "auth.verifyEmail.error",
        bodyKey: info.messageKey,
      });
    } finally {
      operationInFlight.current = false;
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (operationInFlight.current || resending || !email || verificationCooldownSeconds(email) > 0 || confirmed) return;
    operationInFlight.current = true;
    setResending(true);
    setAuthError(null);
    try {
      await resendSignUpCode({ username: email });
      recordVerificationCodeSent(email);
      setCooldown(verificationCooldownSeconds(email));
      setResendSucceeded(true);
      add({
        source: "fe",
        level: "info",
        titleKey: "auth.verifyEmail.resendSuccess",
        bodyKey: "auth.verifyEmail.resendSuccessDescription",
      });
    } catch (error: unknown) {
      const info = describeAuthError(error, "auth.verifyEmail.resendErrorDescription");
      setAuthError(info);
      add({
        source: "fe",
        level: "destructive",
        titleKey: "auth.verifyEmail.resendErrorDescription",
        bodyKey: info.messageKey,
      });
    } finally {
      operationInFlight.current = false;
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
          <CardTitle as="h1" className="t-h2">{t("auth.verifyEmail.title")}</CardTitle>
          <CardDescription>
            {t("auth.verifyEmail.subtitle")} <span className="font-medium text-primary [overflow-wrap:anywhere]">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardBody>
          <Stepper steps={ACCOUNT_CREATION_STEPS} current={2} hideFooter>
            <form onSubmit={(event) => { event.preventDefault(); void handleVerify(); }} className="flex flex-col gap-5">
              <FormField htmlFor="verification-code" label={t("auth.verifyEmail.code")}>
                <OtpInput
                  id="verification-code"
                  value={code}
                  onChange={(value) => { setCode(value); setAuthError(null); }}
                  onComplete={(value) => { void handleVerify(value); }}
                  segmented
                  autoFocus
                  disabled={isBusy || resending || confirmed}
                  aria-describedby="verification-code-hint"
                  aria-invalid={!!authError && !confirmed}
                />
                <p id="verification-code-hint" className="t-sm text-muted-foreground mt-2">{t("auth.verifyEmail.codeHint")}</p>
              </FormField>

              <AuthErrorAlert
                error={authError}
                overrides={{ resend: handleResendCode }}
              />

              <Button
                variant="primary"
                type="submit"
                size="lg"
                className="w-full"
                disabled={isBusy || resending || (!confirmed && !/^\d{6}$/.test(code))}
              >
                {isBusy && <Spinner size={16} />}
                {isBusy ? t("auth.verifyEmail.submitting") : confirmed ? t("common.continue") : t("auth.verifyEmail.submit")}
              </Button>

              <div className="text-center flex flex-col gap-2">
                <p className="t-sm text-muted-foreground">{t("auth.verifyEmail.didntReceive")}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mx-auto"
                  onClick={handleResendCode}
                  disabled={isBusy || resending || cooldown > 0 || confirmed}
                >
                  <Icon name="refresh" size={16} className={resending ? "animate-spin" : undefined} />
                  {resending
                    ? t("auth.verifyEmail.resending")
                    : cooldown > 0
                      ? t("auth.verifyEmail.resendCooldown", { seconds: cooldown })
                      : t("auth.verifyEmail.resendCode")}
                </Button>
                {resendSucceeded && <p role="status" className="t-sm text-success">{t("auth.verifyEmail.resendSuccessDescription")}</p>}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-primary font-medium hover:underline t-sm"
                  onClick={async () => { await logout(); ["verificationEmail", "verificationOrigin", "verificationUsername", "verificationFirstName", "verificationLastName", "verificationGender", "verificationGenderOther"].forEach((key) => sessionStorage.removeItem(key)); navigate(ROUTES.LOGIN); }}
                >
                  {t("auth.logout")}
                </button>
              </div>
            </form>
          </Stepper>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
