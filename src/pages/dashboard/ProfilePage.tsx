import { useState } from "react";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateProfile } from "@/hooks/useProfile";
import { PasswordStrengthIndicator } from "@/components/common/PasswordStrengthIndicator";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Icon,
  Spinner,
} from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { ROUTES } from "@/routePaths";

// ── Validation schemas (Zod messages are i18n keys, resolved via t() at the
//    FormField call site — same pattern as Register.tsx). ────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, "auth.validation.firstNameRequired"),
  lastName: z.string().min(1, "auth.validation.lastNameRequired"),
  username: z
    .string()
    .min(3, "auth.validation.usernameMinLength")
    .regex(/^[a-zA-Z0-9_-]+$/, "auth.validation.usernamePattern"),
});

// Reuse the full AWS Cognito password policy from Register.tsx — do NOT weaken.
const newPasswordSchema = z
  .string()
  .min(8, "auth.validation.passwordMinLength")
  .regex(/[a-z]/, "auth.validation.passwordLowercase")
  .regex(/[A-Z]/, "auth.validation.passwordUppercase")
  .regex(/[0-9]/, "auth.validation.passwordNumber")
  .regex(/[^a-zA-Z0-9]/, "auth.validation.passwordSpecial");

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "profile.currentPasswordRequired"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "auth.validation.passwordsDontMatch",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

type SecurityView = "menu" | "changePassword";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, updatePassword, applyProfileUpdate, resetPassword } = useAuthContext();
  const { add } = useNotifications();
  const [, navigate] = useLocation();
  const updateProfile = useUpdateProfile();

  usePageTitle([t("profile.title")]);

  // Zod messages are i18n keys; resolve through t() (missing keys fall back to the key).
  const tErr = (key?: string) => (key ? t(key) : undefined);

  const [isEditing, setIsEditing] = useState(false);
  const [securityView, setSecurityView] = useState<SecurityView>("menu");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
    },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPasswordValue = passwordForm.watch("newPassword") || "";

  const placeholder = t("profile.notSpecified");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const startEdit = () => {
    profileForm.reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    profileForm.reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
    });
    setIsEditing(false);
  };

  const handleProfileSubmit = async (values: ProfileForm) => {
    if (!user?.userId) return;
    try {
      await updateProfile.mutateAsync({ userId: user.userId, data: values });
      // Sync the cached AuthUser so the sidebar/header name updates immediately.
      applyProfileUpdate(values);
      add({
        source: "fe",
        level: "info",
        titleKey: "profile.updated",
        bodyKey: "profile.updatedDescription",
      });
      setIsEditing(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("profile.updateErrorDescription");
      add({
        source: "fe",
        level: "destructive",
        titleKey: "profile.updateError",
        bodyKey: message,
      });
    }
  };

  const handlePasswordSubmit = async (values: ChangePasswordForm) => {
    setChangingPassword(true);
    try {
      await updatePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      add({
        source: "fe",
        level: "info",
        titleKey: "profile.passwordChanged",
        bodyKey: "profile.passwordChangedDescription",
      });
      passwordForm.reset();
      setSecurityView("menu");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("profile.passwordChangeErrorDescription");
      add({
        source: "fe",
        level: "destructive",
        titleKey: "profile.passwordChangeError",
        bodyKey: message,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      // Reuse the existing Cognito reset flow (ForgotPassword.tsx parity).
      await resetPassword({ username: user.email });
      sessionStorage.setItem("resetPasswordEmail", user.email);
      add({
        source: "fe",
        level: "info",
        titleKey: "profile.emailSent",
        bodyKey: "profile.emailSentDescription",
      });
      navigate(ROUTES.RESET_PASSWORD);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("profile.passwordChangeErrorDescription");
      add({
        source: "fe",
        level: "destructive",
        titleKey: "profile.passwordChangeError",
        bodyKey: message,
      });
    } finally {
      setSendingReset(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const roleLabel = user?.role ? t(`profile.roles.${user.role}`) : placeholder;

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="icon-pill icon-pill-lg icon-pill-primary-soft">
          <Icon name="user" size={22} />
        </span>
        <div>
          <h1 className="t-h1 mb-1">{t("profile.title")}</h1>
          <p className="t-body text-muted-foreground">{t("profile.security")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Personal info ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon name="user" size={18} className="text-primary" />
                <CardTitle>{t("profile.personalInfo")}</CardTitle>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" icon="edit" onClick={startEdit}>
                  {t("common.edit")}
                </Button>
              )}
            </div>
            <CardDescription>
              {isEditing ? t("profile.updateInfo") : t("profile.contactInfo")}
            </CardDescription>
          </CardHeader>
          <CardBody>
            {!isEditing ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="t-label">{t("profile.firstName")}</div>
                  <p className="t-body font-medium text-foreground">
                    {user?.firstName || placeholder}
                  </p>
                </div>
                <div>
                  <div className="t-label">{t("profile.lastName")}</div>
                  <p className="t-body font-medium text-foreground">
                    {user?.lastName || placeholder}
                  </p>
                </div>
                <div>
                  <div className="t-label">{t("common.email")}</div>
                  <p className="t-body font-medium text-foreground">
                    {user?.email || placeholder}
                  </p>
                </div>
                <div>
                  <div className="t-label">{t("profile.username")}</div>
                  <p className="t-body font-medium text-foreground">
                    {user?.username || placeholder}
                  </p>
                </div>
                <div>
                  <div className="t-label">{t("common.role")}</div>
                  <span className="badge badge-primary-soft mt-1">{roleLabel}</span>
                </div>
              </div>
            ) : (
              <form
                onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label={t("profile.firstName")}
                    required
                    error={tErr(profileForm.formState.errors.firstName?.message)}
                  >
                    <Controller
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => <Input {...field} />}
                    />
                  </FormField>
                  <FormField
                    label={t("profile.lastName")}
                    required
                    error={tErr(profileForm.formState.errors.lastName?.message)}
                  >
                    <Controller
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => <Input {...field} />}
                    />
                  </FormField>
                </div>

                <FormField
                  label={t("profile.username")}
                  required
                  error={tErr(profileForm.formState.errors.username?.message)}
                >
                  <Controller
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => <Input {...field} />}
                  />
                </FormField>

                {/* Email is a Cognito-managed attribute — read-only, never sent in PUT. */}
                <FormField label={t("common.email")}>
                  <Input value={user?.email ?? ""} readOnly disabled />
                </FormField>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending && <Spinner size={16} />}
                    {updateProfile.isPending ? t("profile.saving") : t("profile.saveChanges")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={updateProfile.isPending}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* ── Security ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="lock" size={18} className="text-primary" />
              <CardTitle>{t("profile.security")}</CardTitle>
            </div>
            <CardDescription>{t("profile.securityDescription")}</CardDescription>
          </CardHeader>
          <CardBody>
            {securityView === "menu" ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setSecurityView("changePassword")}
                  className="card-hover flex items-center gap-3 w-full text-left p-4 rounded-lg border border-border bg-card"
                >
                  <span className="icon-pill icon-pill-primary-soft">
                    <Icon name="lock" size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="t-body font-medium text-foreground">
                      {t("profile.changePassword")}
                    </div>
                    <div className="t-sm text-muted-foreground">
                      {t("profile.changePasswordDescription")}
                    </div>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={handleSendResetLink}
                  disabled={sendingReset || !user?.email}
                  className="card-hover flex items-center gap-3 w-full text-left p-4 rounded-lg border border-border bg-card disabled:opacity-60"
                >
                  <span className="icon-pill icon-pill-muted">
                    <Icon name="refresh" size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="t-body font-medium text-foreground">
                      {t("profile.resetPassword")}
                    </div>
                    <div className="t-sm text-muted-foreground">
                      {t("profile.resetPasswordDescription")}
                    </div>
                  </div>
                  {sendingReset ? (
                    <Spinner size={16} />
                  ) : (
                    <Icon name="chevronRight" size={16} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="arrowLeft"
                  className="self-start"
                  onClick={() => {
                    passwordForm.reset();
                    setSecurityView("menu");
                  }}
                >
                  {t("profile.back")}
                </Button>

                <form
                  onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    label={t("profile.currentPassword")}
                    required
                    error={tErr(passwordForm.formState.errors.currentPassword?.message)}
                  >
                    <div className="relative">
                      <Controller
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <Input
                            type={showCurrent ? "text" : "password"}
                            className="pr-10"
                            {...field}
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        aria-label={t(showCurrent ? "auth.hidePassword" : "auth.showPassword")}
                        className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        <Icon name={showCurrent ? "eyeOff" : "eye"} size={16} />
                      </button>
                    </div>
                  </FormField>

                  <FormField
                    label={t("profile.newPassword")}
                    required
                    error={tErr(passwordForm.formState.errors.newPassword?.message)}
                  >
                    <div className="relative">
                      <Controller
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <Input
                            type={showNew ? "text" : "password"}
                            className="pr-10"
                            {...field}
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label={t(showNew ? "auth.hidePassword" : "auth.showPassword")}
                        className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        <Icon name={showNew ? "eyeOff" : "eye"} size={16} />
                      </button>
                    </div>
                  </FormField>

                  {newPasswordValue && <PasswordStrengthIndicator password={newPasswordValue} />}

                  <FormField
                    label={t("profile.confirmPassword")}
                    required
                    error={tErr(passwordForm.formState.errors.confirmPassword?.message)}
                  >
                    <div className="relative">
                      <Controller
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <Input
                            type={showConfirm ? "text" : "password"}
                            className="pr-10"
                            {...field}
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={t(showConfirm ? "auth.hidePassword" : "auth.showPassword")}
                        className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        <Icon name={showConfirm ? "eyeOff" : "eye"} size={16} />
                      </button>
                    </div>
                  </FormField>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={changingPassword}
                  >
                    {changingPassword && <Spinner size={16} />}
                    {changingPassword ? t("profile.saving") : t("profile.changePassword")}
                  </Button>
                </form>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
