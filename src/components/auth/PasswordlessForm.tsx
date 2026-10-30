import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuthErrorAlert } from "@/components/common/AuthErrorAlert";
import { Button, Input, OtpInput, Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { describeAuthError, type AuthErrorInfo } from "@/lib/authErrors";
import { recordVerificationCodeSent, verificationCooldownSeconds } from "@/lib/verificationCooldown";

export type PasswordlessMethod = "code" | "link";

interface PasswordlessFormProps {
  method: PasswordlessMethod;
  initialEmail: string;
  onUsePassword: () => void;
  /** The account exists but its email was never confirmed. */
  onNeedsVerification: (email: string) => void;
}

const emailSchema = z.string().email();
// Shares the per-address cooldown with sign-up codes: the backend allows one mail a minute.
const cooldownKey = (method: PasswordlessMethod, email: string) => `${method}:${email}`;

/** Sign in with a one-time code or a magic link, both mailed by Cognito. */
export function PasswordlessForm({ method, initialEmail, onUsePassword, onNeedsVerification }: PasswordlessFormProps) {
  const { t } = useLanguage();
  const { requestEmailCode, confirmEmailCode, requestMagicLink } = useAuthContext();
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<AuthErrorInfo | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown(verificationCooldownSeconds(cooldownKey(method, email))), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown, email, method]);

  const send = async () => {
    if (!emailSchema.safeParse(email).success) {
      setError({ messageKey: "auth.validation.emailRequired", name: "", action: null });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ready = method === "code" ? await requestEmailCode(email) : await requestMagicLink(email);
      if (!ready) {
        onNeedsVerification(email);
        return;
      }
      recordVerificationCodeSent(cooldownKey(method, email));
      setCooldown(verificationCooldownSeconds(cooldownKey(method, email)));
      setSent(true);
      setCode("");
    } catch (err) {
      setError(describeAuthError(err, "auth.login.error"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (value = code) => {
    if (busy || !/^\d{6,8}$/.test(value)) return;
    setBusy(true);
    setError(null);
    try {
      // AuthContext sets the user; Login's effect then moves on to org selection.
      await confirmEmailCode(value);
    } catch (err) {
      setError(describeAuthError(err, "auth.login.error"));
      setBusy(false);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (sent && method === "code") void confirm();
    else void send();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label={t("auth.login.email")} htmlFor="passwordless-email">
        <Input
          id="passwordless-email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.login.emailPlaceholder")}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSent(false); setError(null); }}
          disabled={busy || sent}
          required
        />
      </FormField>

      {sent && method === "code" && (
        <FormField label={t("auth.verifyEmail.code")} htmlFor="passwordless-code">
          <OtpInput
            id="passwordless-code"
            value={code}
            onChange={(value) => { setCode(value); setError(null); }}
            onComplete={(value) => { void confirm(value); }}
            segmented
            autoFocus
            disabled={busy}
          />
        </FormField>
      )}

      {sent && (
        <p className="t-sm text-muted-foreground text-center" role="status">
          {t(method === "code" ? "auth.login.codeSent" : "auth.login.linkSent", { email })}
        </p>
      )}

      <AuthErrorAlert error={error} />

      {!(sent && method === "link") && (
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy && <Spinner size={16} />}
          {t(!sent ? (method === "code" ? "auth.login.sendCode" : "auth.login.sendLink") : "auth.login.submit")}
        </Button>
      )}

      {sent && (
        <Button type="button" variant="ghost" className="w-full" disabled={busy || cooldown > 0} onClick={() => { void send(); }}>
          {cooldown > 0 ? t("auth.login.resendIn", { seconds: cooldown }) : t("auth.login.resend")}
        </Button>
      )}

      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={onUsePassword}>
        {t("auth.login.usePassword")}
      </Button>
    </form>
  );
}
