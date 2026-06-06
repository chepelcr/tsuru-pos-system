import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon, Badge, Spinner } from "@/components/ui";
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import {
  useValidateCredentials,
  useSaveOrgConfigurations,
} from "@/hooks/useOrgConfigurations";
import type { HaciendaFormState } from "@/types/orgConfigurations";

interface HaciendaCredentialsStepperProps {
  orgId: string;
  onSaved: () => void;
}

const EMPTY_FORM: HaciendaFormState = {
  username: "",
  password: "",
  status: 1,
  certData: "",
  certPin: "",
  certName: "",
};

/**
 * First-time setup for Hacienda credentials. Three steps:
 *   1. Credentials (username + password with inline Verify)
 *   2. Certificate (.p12 file + PIN)
 *   3. Review + Save
 *
 * Mirrors the editor drawer's mutation surface so once saved, the page swaps
 * to the existing HaciendaTab summary + drawer for edits.
 */
export function HaciendaCredentialsStepper({ orgId, onSaved }: HaciendaCredentialsStepperProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<HaciendaFormState>(EMPTY_FORM);
  const [credentialsValid, setCredentialsValid] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [current, setCurrent] = useState(0);

  const validateMutation = useValidateCredentials(orgId);
  const saveMutation = useSaveOrgConfigurations(orgId);

  const handleCredentialChange = (patch: Partial<HaciendaFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    if ("username" in patch || "password" in patch) {
      setCredentialsValid(false);
      setVerifyError("");
    }
  };

  const handleVerify = async () => {
    if (!form.username || !form.password) return;
    setVerifyError("");
    try {
      const result = await validateMutation.mutateAsync({
        username: form.username,
        password: form.password,
      });
      if (result.is_valid) setCredentialsValid(true);
      else {
        setCredentialsValid(false);
        setVerifyError(t("orgSettings.hacienda.verifyError"));
      }
    } catch {
      setCredentialsValid(false);
      setVerifyError(t("orgSettings.hacienda.verifyError"));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      setForm((f) => ({ ...f, certData: base64, certName: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      username: form.username,
      password: form.password,
      status: form.status,
    };
    if (form.certData) {
      payload.certificate = {
        data: form.certData,
        pin: form.certPin,
        name: form.certName,
      };
    }
    try {
      await saveMutation.mutateAsync(payload);
      onSaved();
    } catch {
      // error surfaces via saveMutation.isError
    }
  };

  const steps: StepperStep[] = [
    { id: "credentials", titleKey: "orgSettings.hacienda.steps.credentials" },
    { id: "certificate", titleKey: "orgSettings.hacienda.steps.certificate" },
    { id: "review", titleKey: "orgSettings.hacienda.steps.review" },
  ];

  const canAdvance = (() => {
    switch (current) {
      case 0:
        return credentialsValid;
      case 1:
        return true; // certificate optional during initial setup
      case 2:
        return credentialsValid;
      default:
        return true;
    }
  })();

  return (
    <div className="space-y-6">
      <Stepper
        steps={steps}
        current={current}
        canAdvance={canAdvance}
        isSaving={saveMutation.isPending}
        onPrev={() => setCurrent((c) => Math.max(0, c - 1))}
        onNext={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
        onSave={handleSave}
      >
        {current === 0 && (
          <div className="space-y-5">
            <header>
              <h2 className="t-h3 mb-1">{t("orgSettings.hacienda.steps.credentials")}</h2>
              <p className="t-sm text-muted-foreground">
                {t("orgSettings.hacienda.empty.desc")}
              </p>
            </header>

            <div>
              <label className="pp-label" htmlFor="hac-username">
                {t("orgSettings.hacienda.username")}
              </label>
              <input
                id="hac-username"
                className="pp-input w-full mt-1"
                type="text"
                value={form.username}
                onChange={(e) => handleCredentialChange({ username: e.target.value })}
                placeholder="3101234567@stag.comprobanteselectronicos.go.cr"
              />
            </div>

            <div>
              <label className="pp-label" htmlFor="hac-password">
                {t("orgSettings.hacienda.password")}
              </label>
              <input
                id="hac-password"
                className="pp-input w-full mt-1"
                type="password"
                value={form.password}
                onChange={(e) => handleCredentialChange({ password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleVerify}
                disabled={!form.username || !form.password || validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <>
                    <Spinner size={13} />
                    {t("orgSettings.hacienda.verifying")}
                  </>
                ) : (
                  <>
                    <Icon name="checkCircle" size={14} />
                    {t("orgSettings.hacienda.verify")}
                  </>
                )}
              </button>

              {credentialsValid && (
                <Badge variant="success">
                  <Icon name="checkCircle" size={12} className="mr-1" />
                  {t("orgSettings.hacienda.verifySuccess")}
                </Badge>
              )}
            </div>

            {verifyError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
                <span className="t-sm text-destructive">{verifyError}</span>
              </div>
            )}
          </div>
        )}

        {current === 1 && (
          <div className="space-y-5">
            <header>
              <h2 className="t-h3 mb-1">{t("orgSettings.hacienda.certificate")}</h2>
              <p className="t-sm text-muted-foreground">
                {t("orgSettings.hacienda.steps.certificate")} (.p12)
              </p>
            </header>

            <div>
              <label className="pp-label">{t("orgSettings.hacienda.certFile")}</label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".p12"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm w-full justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="upload" size={14} />
                  {form.certName || t("orgSettings.hacienda.certFile")}
                </button>
              </div>
            </div>

            <div>
              <label className="pp-label" htmlFor="hac-pin">
                {t("orgSettings.hacienda.certPin")}
              </label>
              <input
                id="hac-pin"
                className="pp-input w-full mt-1"
                type="password"
                value={form.certPin}
                onChange={(e) => setForm((f) => ({ ...f, certPin: e.target.value }))}
                placeholder="••••••"
              />
            </div>
          </div>
        )}

        {current === 2 && (
          <div className="space-y-5">
            <header>
              <h2 className="t-h3 mb-1">{t("orgSettings.hacienda.review.title")}</h2>
              <p className="t-sm text-muted-foreground">
                {t("orgSettings.hacienda.review.subtitle")}
              </p>
            </header>

            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="t-sm text-muted-foreground">
                  {t("orgSettings.hacienda.username")}
                </span>
                <span className="t-sm font-medium break-all">{form.username}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="t-sm text-muted-foreground">
                  {t("orgSettings.hacienda.password")}
                </span>
                <span className="t-sm font-medium tracking-widest text-muted-foreground">••••••••</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="t-sm text-muted-foreground">
                  {t("orgSettings.hacienda.certificate")}
                </span>
                <span className="t-sm font-medium">
                  {form.certName || (
                    <span className="text-muted-foreground italic">
                      {t("orgSettings.hacienda.review.noCertificate")}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </Stepper>

      {saveMutation.isError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
          <span className="t-sm text-destructive">
            {t("orgSettings.fiscalInfo.saveError")}
          </span>
        </div>
      )}
    </div>
  );
}
