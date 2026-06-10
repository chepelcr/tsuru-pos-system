import { useState } from "react";
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

const schema = z.object({
  email: z.string().email("auth.validation.emailRequired"),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { t } = useLanguage();
  const { resetPassword } = useAuthContext();
  const { add } = useNotifications();
  const [, navigate] = useLocation();

  const [submitted, setSubmitted] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  usePageTitle([t("auth.forgotPassword.title")]);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotForm) => {
    setSubmitting(true);
    try {
      await resetPassword({ username: data.email });
      sessionStorage.setItem("resetPasswordEmail", data.email);
      setSentEmail(data.email);
      setSubmitted(true);
      add({
        source: "fe",
        level: "info",
        titleKey: "auth.forgotPassword.success",
        bodyKey: "auth.forgotPassword.successDescription",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.forgotPassword.error");
      add({ source: "fe", level: "destructive", titleKey: "auth.forgotPassword.error", bodyKey: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout maxWidthClassName="max-w-md">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 icon-pill icon-pill-lg icon-pill-success">
              <Icon name="check" size={24} />
            </div>
            <CardTitle className="t-h2">{t("auth.forgotPassword.checkEmail.title")}</CardTitle>
            <CardDescription>
              {t("auth.forgotPassword.checkEmail.subtitle")}{" "}
              <span className="font-medium text-primary">{sentEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Button variant="primary" className="w-full" onClick={() => navigate(ROUTES.RESET_PASSWORD)}>
              {t("auth.forgotPassword.checkEmail.enterCode")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
              {t("auth.forgotPassword.checkEmail.differentEmail")}
            </Button>
            <div className="text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline t-sm"
                onClick={() => navigate(ROUTES.LOGIN)}
              >
                <Icon name="arrowLeft" size={14} />
                {t("auth.forgotPassword.backToLogin")}
              </button>
            </div>
          </CardBody>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout maxWidthClassName="max-w-md">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="t-h2">{t("auth.forgotPassword.title")}</CardTitle>
          <CardDescription>{t("auth.forgotPassword.subtitle")}</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              label={t("auth.forgotPassword.email")}
              required
              error={form.formState.errors.email?.message ? t(form.formState.errors.email.message) : undefined}
            >
              <Controller
                control={form.control}
                name="email"
                render={({ field }) => (
                  <Input
                    type="email"
                    placeholder={t("auth.forgotPassword.emailPlaceholder")}
                    disabled={submitting}
                    {...field}
                  />
                )}
              />
            </FormField>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting && <Spinner size={16} />}
              {submitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Button variant="link" icon="arrowLeft" onClick={() => navigate(ROUTES.LOGIN)}>
              {t("auth.forgotPassword.backToLogin")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
