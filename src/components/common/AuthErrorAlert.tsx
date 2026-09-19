import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { FormAlert, type FormAlertAction } from "@/components/common/FormAlert";
import type { AuthErrorAction, AuthErrorInfo } from "@/lib/authErrors";
import { ROUTES } from "@/routePaths";

interface AuthErrorAlertProps {
  /** Result of `describeAuthError`, or null to render nothing. */
  error: AuthErrorInfo | null;
  /**
   * Per-page handlers. A page overrides an action when it needs to do something
   * before navigating (Register stashes the verification hand-off) or when the
   * action stays on the page (VerifyEmail's resend).
   */
  overrides?: Partial<Record<Exclude<AuthErrorAction, null>, () => void>>;
  className?: string;
}

/**
 * The visible half of the auth error fix (roadmap TSR-309): renders the mapped
 * message inside the form, plus a button for the way out that
 * `describeAuthError` suggested — "already exists" is a dead end without one.
 */
export function AuthErrorAlert({ error, overrides, className }: AuthErrorAlertProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  if (!error) return null;

  const defaults: Record<Exclude<AuthErrorAction, null>, () => void> = {
    verify: () => navigate(ROUTES.VERIFY_EMAIL),
    login: () => navigate(ROUTES.LOGIN),
    register: () => navigate(ROUTES.REGISTER),
    forgotPassword: () => navigate(ROUTES.FORGOT_PASSWORD),
    // Resend only exists on a page that owns a code; without an override there
    // is nothing to resend, so offer the verification screen instead.
    resend: () => navigate(ROUTES.VERIFY_EMAIL),
  };

  const actions: FormAlertAction[] = [];
  if (error.action) {
    actions.push({
      label: t(`auth.errors.action.${error.action}`),
      onClick: overrides?.[error.action] ?? defaults[error.action],
    });
  }

  return (
    <FormAlert
      message={t(error.messageKey)}
      detail={error.detail}
      actions={actions}
      className={className}
    />
  );
}
