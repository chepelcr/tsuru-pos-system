import { useState, useEffect, useRef } from "react";
import { KeyRound, FileKey } from "lucide-react";
import { Drawer, Icon, Badge, Spinner } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { useValidateCredentials, useSaveOrgConfigurations } from "@/hooks/useOrgConfigurations";
import type { OrgConfiguration, HaciendaFormState } from "@/types/orgConfigurations";

interface HaciendaConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  config: OrgConfiguration | null | undefined;
  orgId: string;
}

const EMPTY_FORM: HaciendaFormState = {
  username: "",
  password: "",
  status: 1,
  certData: "",
  certPin: "",
  certName: "",
};

export function HaciendaConfigDrawer({ open, onClose, config, orgId }: HaciendaConfigDrawerProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<HaciendaFormState>(EMPTY_FORM);
  const [credentialsValid, setCredentialsValid] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [certExpanded, setCertExpanded] = useState(false);

  const validateMutation = useValidateCredentials(orgId);
  const saveMutation = useSaveOrgConfigurations(orgId);

  // Pre-fill from existing config when drawer opens
  useEffect(() => {
    if (open && config) {
      setForm({
        username: config.username ?? "",
        password: config.password ?? "",
        status: config.status ?? 1,
        certData: "",
        certPin: "",
        certName: "",
      });
      setCredentialsValid(true);
      setVerifyError("");
    } else if (open && !config) {
      setForm(EMPTY_FORM);
      setCredentialsValid(false);
      setVerifyError("");
    }
  }, [open, config]);

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
      const result = await validateMutation.mutateAsync({ username: form.username, password: form.password });
      if (result.is_valid) {
        setCredentialsValid(true);
      } else {
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
      onClose();
    } catch {
      // error surfaces via saveMutation.isError
    }
  };

  const canSave = credentialsValid && !saveMutation.isPending;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={config ? t("orgSettings.hacienda.edit") : t("orgSettings.hacienda.configure")}
      icon="settings"
      width="min(600px, 100vw)"
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end border-t border-border">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={saveMutation.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            {saveMutation.isPending ? (
              <><Spinner size={14} /> Guardando…</>
            ) : (
              t("common.save")
            )}
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        {/* Credentials section */}
        <SectionWrapper
          title="Credenciales Hacienda"
          icon={KeyRound}
          isExpanded={true}
          onToggle={() => {}}
        >
          <div className="space-y-4 pt-1">
            <div>
              <label className="pp-label">{t("orgSettings.hacienda.username")}</label>
              <input
                className="pp-input w-full mt-1"
                type="text"
                value={form.username}
                onChange={(e) => handleCredentialChange({ username: e.target.value })}
                placeholder="3101234567@stag.comprobanteselectronicos.go.cr"
              />
            </div>

            <div>
              <label className="pp-label">{t("orgSettings.hacienda.password")}</label>
              <input
                className="pp-input w-full mt-1"
                type="password"
                value={form.password}
                onChange={(e) => handleCredentialChange({ password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            {/* Verify button + status */}
            <div className="flex items-center gap-3 pt-1">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleVerify}
                disabled={!form.username || !form.password || validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <><Spinner size={13} /> Verificando…</>
                ) : (
                  <><Icon name="checkCircle" size={14} /> {t("orgSettings.hacienda.verify")}</>
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

            {saveMutation.isError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
                <span className="t-sm text-destructive">Error al guardar la configuración. Intentá de nuevo.</span>
              </div>
            )}
          </div>
        </SectionWrapper>

        {/* Certificate section */}
        <SectionWrapper
          title={t("orgSettings.hacienda.certificate")}
          icon={FileKey}
          isExpanded={certExpanded}
          onToggle={() => setCertExpanded((v) => !v)}
          badge={config?.certificate?.name ? 1 : undefined}
        >
          <div className="space-y-4 pt-1">
            {/* Existing cert info */}
            {config?.certificate && !form.certData && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <div className="t-xs text-muted-foreground">Certificado actual</div>
                <div className="t-sm font-medium">{config.certificate.name}</div>
                <div className="t-xs text-muted-foreground">
                  Vence: {new Date(config.certificate.expirationDate).toLocaleDateString()}
                </div>
              </div>
            )}

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
                  className="btn btn-outline btn-sm w-full justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="upload" size={14} />
                  {form.certName || (config?.certificate ? "Reemplazar certificado" : "Seleccionar archivo .p12")}
                </button>
              </div>
            </div>

            <div>
              <label className="pp-label">{t("orgSettings.hacienda.certPin")}</label>
              <input
                className="pp-input w-full mt-1"
                type="password"
                value={form.certPin}
                onChange={(e) => setForm((f) => ({ ...f, certPin: e.target.value }))}
                placeholder="PIN del certificado"
              />
            </div>
          </div>
        </SectionWrapper>
      </div>
    </Drawer>
  );
}
