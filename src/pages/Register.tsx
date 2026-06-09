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
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import { PasswordStrengthIndicator } from "@/components/common/PasswordStrengthIndicator";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Button, Input, Select, Icon, Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { ROUTES } from "@/routePaths";

// AWS Cognito password policy: min 8 chars, uppercase, lowercase, number, special char.
// Messages are i18n keys, resolved through t() at the FormField call sites.
const passwordSchema = z
  .string()
  .min(8, "auth.validation.passwordMinLength")
  .regex(/[a-z]/, "auth.validation.passwordLowercase")
  .regex(/[A-Z]/, "auth.validation.passwordUppercase")
  .regex(/[0-9]/, "auth.validation.passwordNumber")
  .regex(/[^a-zA-Z0-9]/, "auth.validation.passwordSpecial");

const step1Schema = z
  .object({
    firstName: z.string().min(1, "auth.validation.firstNameRequired"),
    lastName: z.string().min(1, "auth.validation.lastNameRequired"),
    username: z
      .string()
      .min(3, "auth.validation.usernameMinLength")
      .regex(/^[a-zA-Z0-9_-]+$/, "auth.validation.usernamePattern"),
    email: z.string().email("auth.validation.emailRequired"),
    gender: z.string().optional(),
    genderOther: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.gender === "other" && !data.genderOther?.trim()) {
        return false;
      }
      return true;
    },
    { message: "auth.validation.genderRequired", path: ["genderOther"] },
  );

const step2Schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.validation.passwordsDontMatch",
    path: ["confirmPassword"],
  });

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

const MACRO_STEPS: StepperStep[] = [
  { id: "register", titleKey: "auth.register.steps.personalInfo" },
  { id: "verify", titleKey: "auth.register.steps.verify" },
  { id: "organization", titleKey: "auth.register.steps.organization" },
];

export default function Register() {
  const [, navigate] = useLocation();
  const { signUp } = useAuthContext();
  const { add } = useNotifications();
  const { t, language } = useLanguage();

  usePageTitle([t("auth.register.title")]);

  // Zod messages are i18n keys; resolve through t() (missing keys fall back to the key).
  const tErr = (key?: string) => (key ? t(key) : undefined);


  const [currentStep, setCurrentStep] = useState<"info" | "password">("info");
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGenderInput, setShowGenderInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const genderSelectId = "register-gender-select";

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { firstName: "", lastName: "", username: "", email: "", gender: "", genderOther: "" },
  });

  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const currentPassword = step2Form.watch("password") || "";

  // Pre-populate step1 form if we have data and the user goes back.
  useEffect(() => {
    if (step1Data && currentStep === "info") {
      step1Form.reset(step1Data);
      if (step1Data.gender === "other") {
        setShowGenderInput(true);
      }
    }
  }, [step1Data, currentStep, step1Form]);

  const handleStep1Submit = (values: Step1Form) => {
    setStep1Data(values);
    setCurrentStep("password");
  };

  const handleStep2Submit = async (values: Step2Form) => {
    if (!step1Data) {
      add({
        source: "fe",
        level: "destructive",
        titleKey: "common.error",
        bodyKey: "auth.register.completeStep1",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        username: step1Data.email,
        password: values.password,
        firstName: step1Data.firstName,
        lastName: step1Data.lastName,
        preferredUsername: step1Data.username,
        email: step1Data.email,
        locale: language,
      });

      if (result.needsVerification) {
        sessionStorage.setItem("verificationEmail", step1Data.email);
        sessionStorage.setItem("verificationPassword", values.password);
        sessionStorage.setItem("verificationUsername", step1Data.username);
        sessionStorage.setItem("verificationFirstName", step1Data.firstName);
        sessionStorage.setItem("verificationLastName", step1Data.lastName);
        if (step1Data.gender) sessionStorage.setItem("verificationGender", step1Data.gender);
        if (step1Data.genderOther) sessionStorage.setItem("verificationGenderOther", step1Data.genderOther);

        add({
          source: "fe",
          level: "info",
          titleKey: "auth.register.success",
          bodyKey: "auth.register.successDescription",
        });
        navigate(ROUTES.VERIFY_EMAIL);
      } else {
        add({
          source: "fe",
          level: "info",
          titleKey: "auth.register.complete",
          bodyKey: "auth.register.completeDescription",
        });
        navigate(ROUTES.SELECT_ORG);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.register.error");
      add({ source: "fe", level: "destructive", titleKey: "common.error", bodyKey: message });
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToStep1 = () => setCurrentStep("info");

  return (
    <AuthLayout maxWidthClassName="max-w-lg">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="t-h2">{t("auth.register.title")}</CardTitle>
          <CardDescription>{t("auth.register.subtitle")}</CardDescription>
        </CardHeader>
        <CardBody>
          <Stepper steps={MACRO_STEPS} current={0} hideFooter>
            {currentStep === "info" && (
              <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label={t("auth.register.firstName")}
                    required
                    error={tErr(step1Form.formState.errors.firstName?.message)}
                  >
                    <Controller
                      control={step1Form.control}
                      name="firstName"
                      render={({ field }) => (
                        <Input placeholder={t("auth.register.firstNamePlaceholder")} {...field} />
                      )}
                    />
                  </FormField>
                  <FormField
                    label={t("auth.register.lastName")}
                    required
                    error={tErr(step1Form.formState.errors.lastName?.message)}
                  >
                    <Controller
                      control={step1Form.control}
                      name="lastName"
                      render={({ field }) => (
                        <Input placeholder={t("auth.register.lastNamePlaceholder")} {...field} />
                      )}
                    />
                  </FormField>
                </div>

                <FormField label={t("auth.register.email")} required error={tErr(step1Form.formState.errors.email?.message)}>
                  <Controller
                    control={step1Form.control}
                    name="email"
                    render={({ field }) => (
                      <Input type="email" placeholder={t("auth.register.emailPlaceholder")} {...field} />
                    )}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label={t("auth.register.username")}
                    required
                    error={tErr(step1Form.formState.errors.username?.message)}
                  >
                    <Controller
                      control={step1Form.control}
                      name="username"
                      render={({ field }) => (
                        <Input placeholder={t("auth.register.usernamePlaceholder")} {...field} />
                      )}
                    />
                  </FormField>

                  {!showGenderInput ? (
                    <FormField label={t("auth.register.gender")} error={tErr(step1Form.formState.errors.gender?.message)}>
                      <Select
                        id={genderSelectId}
                        value={step1Form.watch("gender") || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          step1Form.setValue("gender", value);
                          if (value === "other") {
                            setShowGenderInput(true);
                            step1Form.setValue("genderOther", "");
                          }
                        }}
                      >
                        <option value="" disabled>
                          {t("auth.register.gender.placeholder")}
                        </option>
                        <option value="male">{t("auth.register.gender.male")}</option>
                        <option value="female">{t("auth.register.gender.female")}</option>
                        <option value="other">{t("auth.register.gender.other")}</option>
                        <option value="prefer_not_to_say">{t("auth.register.gender.preferNotToSay")}</option>
                      </Select>
                    </FormField>
                  ) : (
                    <FormField
                      label={t("auth.register.gender")}
                      error={tErr(step1Form.formState.errors.genderOther?.message)}
                    >
                      <div className="relative">
                        <Controller
                          control={step1Form.control}
                          name="genderOther"
                          render={({ field }) => (
                            <Input
                              placeholder={t("auth.register.gender.otherPlaceholder")}
                              className="pr-10"
                              {...field}
                            />
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowGenderInput(false);
                            step1Form.setValue("gender", "");
                            step1Form.setValue("genderOther", "");
                            setTimeout(() => document.getElementById(genderSelectId)?.focus(), 0);
                          }}
                          aria-label={t("auth.register.gender.change")}
                          className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                        >
                          <Icon name="chevronDown" size={16} />
                        </button>
                      </div>
                    </FormField>
                  )}
                </div>

                <Button type="submit" variant="primary" className="w-full mt-1" iconRight="arrowRight">
                  {t("auth.register.continue")}
                </Button>
              </form>
            )}

            {currentStep === "password" && (
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="flex flex-col gap-4">
                <FormField
                  label={t("auth.register.password")}
                  required
                  error={tErr(step2Form.formState.errors.password?.message)}
                >
                  <div className="relative">
                    <Controller
                      control={step2Form.control}
                      name="password"
                      render={({ field }) => (
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.register.passwordPlaceholder")}
                          className="pr-10"
                          {...field}
                        />
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
                      className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                    </button>
                  </div>
                </FormField>

                {currentPassword && <PasswordStrengthIndicator password={currentPassword} />}

                <FormField
                  label={t("auth.register.confirmPassword")}
                  required
                  error={tErr(step2Form.formState.errors.confirmPassword?.message)}
                >
                  <div className="relative">
                    <Controller
                      control={step2Form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("auth.register.confirmPasswordPlaceholder")}
                          className="pr-10"
                          {...field}
                        />
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={t(showConfirmPassword ? "auth.hidePassword" : "auth.showPassword")}
                      className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      <Icon name={showConfirmPassword ? "eyeOff" : "eye"} size={16} />
                    </button>
                  </div>
                </FormField>

                <div className="flex gap-3 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    icon="arrowLeft"
                    onClick={goBackToStep1}
                    disabled={submitting}
                  >
                    {t("auth.register.back")}
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
                    {submitting && <Spinner size={16} />}
                    {submitting ? t("auth.register.submitting") : t("auth.register.createAccount")}
                  </Button>
                </div>
              </form>
            )}
          </Stepper>

          <div className="mt-5 text-center t-sm">
            <span className="text-muted-foreground">{t("auth.register.hasAccount")} </span>
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              {t("auth.register.signIn")}
            </button>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
