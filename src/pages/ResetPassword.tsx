import { useEffect } from "react";
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
import { OtpInput } from "@/components/ui/OtpInput";
import { FormField } from "@/components/forms/FormField";
import { ROUTES } from "@/routePaths";

// Messages are i18n keys, resolved through t() at the FormField call sites.
const passwordSchema = z
  .string()
  .min(8, "auth.validation.passwordMinLength")
  .regex(/[a-z]/, "auth.validation.passwordLowercase")
  .regex(/[A-Z]/, "auth.validation.passwordUppercase")
  .regex(/[0-9]/, "auth.validation.passwordNumber")
  .regex(/[^a-zA-Z0-9]/, "auth.validation.passwordSpecial");

const schema = z
  .object({
    email: z.string().email("auth.validation.emailRequired"),
    code: z.string().length(6, "auth.validation.codeLength"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "auth.validation.passwordsDontMatch",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof schema>;

const PASSWORD_RULES: { test: (pwd: string) => boolean; key: string }[] = [
  { test: (pwd) => pwd.length >= 8, key: "auth.register.passwordRequirements.minLength" },
  { test: (pwd) => /[a-z]/.test(pwd), key: "auth.register.passwordRequirements.lowercase" },
  { test: (pwd) => /[A-Z]/.test(pwd), key: "auth.register.passwordRequirements.uppercase" },
  { test: (pwd) => /[0-9]/.test(pwd), key: "auth.register.passwordRequirements.number" },
  { test: (pwd) => /[^a-zA-Z0-9]/.test(pwd), key: "auth.register.passwordRequirements.special" },
];

export default function ResetPassword() {
  const { t } = useLanguage();
  const { confirmResetPassword } = useAuthContext();
  const { add } = useNotifications();
  const [, navigate] = useLocation();

  usePageTitle([t("auth.resetPassword.title")]);

  // Zod messages are i18n keys; resolve through t() (missing keys fall back to the key).
  const tErr = (key?: string) => (key ? t(key) : undefined);

  const form = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", code: "", newPassword: "", confirmPassword: "" },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Prefill the email captured during the forgot-password step.
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("resetPasswordEmail");
    if (storedEmail) {
      reset((prev) => ({ ...prev, email: storedEmail }));
    }
  }, [reset]);

  const newPassword = watch("newPassword") || "";
  const code = watch("code") || "";

  const onSubmit = async (data: ResetForm) => {
    try {
      await confirmResetPassword({
        username: data.email,
        confirmationCode: data.code,
        newPassword: data.newPassword,
      });

      sessionStorage.removeItem("resetPasswordEmail");

      add({
        source: "fe",
        level: "info",
        titleKey: "auth.resetPassword.success",
        bodyKey: "auth.resetPassword.successDescription",
      });

      navigate(ROUTES.LOGIN);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.resetPassword.error");
      const name = (error as { name?: string })?.name ?? "";

      if (name === "CodeMismatchException" || message.includes("CodeMismatchException")) {
        add({
          source: "fe",
          level: "destructive",
          titleKey: "auth.resetPassword.invalidCode",
          bodyKey: "auth.resetPassword.invalidCodeDescription",
        });
        return;
      }

      if (name === "ExpiredCodeException" || message.includes("ExpiredCodeException")) {
        add({
          source: "fe",
          level: "destructive",
          titleKey: "auth.resetPassword.expiredCode",
          bodyKey: "auth.resetPassword.expiredCodeDescription",
        });
        return;
      }

      add({ source: "fe", level: "destructive", titleKey: "common.error", bodyKey: message });
    }
  };

  return (
    <AuthLayout maxWidthClassName="max-w-md">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 icon-pill icon-pill-lg icon-pill-primary-soft">
            <Icon name="lock" size={24} />
          </div>
          <CardTitle className="t-h2">{t("auth.resetPassword.title")}</CardTitle>
          <CardDescription>{t("auth.resetPassword.subtitle")}</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField label={t("auth.resetPassword.email")} required error={tErr(errors.email?.message)}>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input
                    type="email"
                    placeholder={t("auth.resetPassword.emailPlaceholder")}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />
            </FormField>

            <FormField label={t("auth.resetPassword.code")} required error={tErr(errors.code?.message)}>
              <OtpInput
                value={code}
                onChange={(value) => setValue("code", value, { shouldValidate: true })}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label={t("auth.resetPassword.newPassword")} required error={tErr(errors.newPassword?.message)}>
              <Controller
                control={control}
                name="newPassword"
                render={({ field }) => (
                  <Input
                    type="password"
                    placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />
            </FormField>

            {newPassword && (
              <div className="flex flex-col gap-2">
                {PASSWORD_RULES.map((rule) => {
                  const valid = rule.test(newPassword);
                  return (
                    <div key={rule.key} className="flex items-center gap-2 t-sm">
                      <Icon
                        name={valid ? "checkCircle" : "xCircle"}
                        size={16}
                        className={valid ? "text-success flex-shrink-0" : "text-muted-foreground flex-shrink-0"}
                      />
                      <span className={valid ? "text-success" : "text-muted-foreground"}>{t(rule.key)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <FormField
              label={t("auth.resetPassword.confirmPassword")}
              required
              error={tErr(errors.confirmPassword?.message)}
            >
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field }) => (
                  <Input
                    type="password"
                    placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />
            </FormField>

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Spinner size={16} />}
              {isSubmitting ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
            </Button>
          </form>

          <div className="mt-5 text-center flex flex-col gap-2">
            <button
              type="button"
              className="text-primary font-medium hover:underline t-sm mx-auto"
              onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
            >
              {t("auth.resetPassword.requestNewCode")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline t-sm mx-auto"
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
