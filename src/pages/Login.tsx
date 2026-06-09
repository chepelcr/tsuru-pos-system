import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Button, Input, Icon, Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { ROUTES } from "@/routePaths";

const loginSchema = z.object({
  email: z.string().email("auth.validation.emailRequired"),
  password: z.string().min(1, "auth.validation.passwordRequired"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { t } = useLanguage();
  const { user, login, isLoading } = useAuthContext();
  const { add } = useNotifications();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  usePageTitle([t("pageTitle.login")]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Once a profile is resolved (login succeeded), advance to org selection.
  // NOTE: we deliberately do NOT force-logout on mount — that was an async
  // signOut whose setUser(null) resolved AFTER a fast login, clobbering the
  // fresh session and bouncing the user back to /login. login() already clears
  // any stale Cognito session via signOut() before signIn().
  useEffect(() => {
    if (user && !isLoading) {
      navigate(ROUTES.SELECT_ORG);
    }
  }, [user, isLoading, navigate]);

  const goToVerification = (email: string, password: string) => {
    sessionStorage.setItem("verificationEmail", email);
    sessionStorage.setItem("verificationPassword", password);
    navigate(ROUTES.VERIFY_EMAIL);
  };

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true);
    try {
      const { needsVerification } = await login(data.email, data.password);
      // An unconfirmed user resolves the sign-in next step to CONFIRM_SIGN_UP
      // without throwing — route to verification instead of org selection.
      if (needsVerification) {
        goToVerification(data.email, data.password);
        return;
      }
      // On a confirmed user the AuthContext sets `user` and the effect above
      // navigates to org selection.
      add({
        source: "fe",
        level: "info",
        titleKey: "auth.login.success",
        bodyKey: "auth.login.successDescription",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.login.error");
      const name = (error as { name?: string })?.name ?? "";

      if (
        name === "UserNotConfirmedException" ||
        message.includes("UserNotConfirmedException") ||
        message.includes("CONFIRM_SIGN_UP")
      ) {
        goToVerification(data.email, data.password);
        return;
      }

      add({
        source: "fe",
        level: "destructive",
        titleKey: "auth.login.error",
        bodyKey: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = submitting || isLoading;

  // Zod messages are i18n keys; resolve through t() (missing keys fall back to the key).
  const tErr = (key?: string) => (key ? t(key) : undefined);

  return (
    <AuthLayout maxWidthClassName="max-w-md">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="t-h2">{t("auth.login.title")}</CardTitle>
          <CardDescription>{t("auth.login.subtitle")}</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField label={t("auth.login.email")} error={tErr(form.formState.errors.email?.message)}>
              <Controller
                control={form.control}
                name="email"
                render={({ field }) => (
                  <Input
                    type="email"
                    placeholder={t("auth.login.emailPlaceholder")}
                    disabled={isBusy}
                    {...field}
                  />
                )}
              />
            </FormField>

            <FormField label={t("auth.login.password")} error={tErr(form.formState.errors.password?.message)}>
              <div className="relative">
                <Controller
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.login.passwordPlaceholder")}
                      disabled={isBusy}
                      className="pr-10"
                      {...field}
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isBusy}
                  aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
                  className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
            </FormField>

            <Button type="submit" variant="primary" className="w-full mt-1" disabled={isBusy}>
              {isBusy && <Spinner size={16} />}
              {isBusy ? t("auth.login.submitting") : t("auth.login.submit")}
            </Button>
          </form>

          <div className="mt-5 text-center t-sm flex flex-col gap-2">
            <button
              type="button"
              className="text-primary font-medium hover:underline mx-auto"
              onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
            >
              {t("auth.login.forgotPassword")}
            </button>
            <div>
              <span className="text-muted-foreground">{t("auth.login.noAccount")} </span>
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => navigate(ROUTES.REGISTER)}
              >
                {t("auth.login.register")}
              </button>
            </div>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
