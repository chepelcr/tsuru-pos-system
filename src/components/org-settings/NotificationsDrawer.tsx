import { useState, useEffect } from "react";
import { Drawer, Icon, Spinner } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSaveNotifications } from "@/hooks/useOrgConfigurations";
import type { OrgConfiguration, NotificationsFormState } from "@/types/orgConfigurations";

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
  config: OrgConfiguration | null | undefined;
  orgId: string;
}

const EMPTY_FORM: NotificationsFormState = {
  callbackUrl: "",
  notifySentDocuments: 3,
  notifyProcessingDocuments: false,
  notifyReceivedDocuments: true,
};

export function NotificationsDrawer({ open, onClose, config, orgId }: NotificationsDrawerProps) {
  const { t } = useLanguage();
  const saveMutation = useSaveNotifications(orgId);

  const [form, setForm] = useState<NotificationsFormState>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      const ns = config?.notificationSettings;
      setForm({
        callbackUrl: ns?.callbackUrl ?? "",
        notifySentDocuments: ns?.notifySentDocuments ?? 3,
        notifyProcessingDocuments: ns?.notifyProcessingDocuments ?? false,
        notifyReceivedDocuments: ns?.notifyReceivedDocuments ?? true,
      });
    }
  }, [open, config]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(form);
      onClose();
    } catch {
      // error surfaces via saveMutation.isError
    }
  };

  const sentDocOptions = [1, 2, 3, 4] as const;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={config?.notificationSettings
        ? t("orgSettings.notifications.edit")
        : t("orgSettings.notifications.configure")}
      icon="sliders"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end border-t border-border">
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={saveMutation.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
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
      <div className="p-6 space-y-5">
        {/* Callback URL */}
        <div>
          <label className="pp-label">{t("orgSettings.notifications.callbackUrl")}</label>
          <input
            className="pp-input w-full mt-1"
            type="url"
            value={form.callbackUrl}
            onChange={(e) => setForm((f) => ({ ...f, callbackUrl: e.target.value }))}
            placeholder={t("orgSettings.notifications.callbackUrlPlaceholder")}
          />
          <p className="t-xs text-muted-foreground mt-1">
            Opcional. Si se especifica, debe ser una URL válida con http/https.
          </p>
        </div>

        {/* Sent documents */}
        <div>
          <label className="pp-label">{t("orgSettings.notifications.sentDocuments")}</label>
          <select
            className="pp-input w-full mt-1"
            value={form.notifySentDocuments}
            onChange={(e) => setForm((f) => ({ ...f, notifySentDocuments: Number(e.target.value) }))}
          >
            {sentDocOptions.map((opt) => (
              <option key={opt} value={opt}>
                {t(`orgSettings.notifications.sentOpts.${opt}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle: processing documents */}
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left p-4 rounded-lg border border-border bg-card">
          <div>
            <div className="t-sm font-medium">{t("orgSettings.notifications.processing")}</div>
            <div className="t-xs text-muted-foreground mt-0.5">
              Notificar cuando un documento está en proceso de validación
            </div>
          </div>
          <button
            role="switch"
            aria-checked={form.notifyProcessingDocuments}
            onClick={() => setForm((f) => ({ ...f, notifyProcessingDocuments: !f.notifyProcessingDocuments }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              form.notifyProcessingDocuments ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                form.notifyProcessingDocuments ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle: received documents */}
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left p-4 rounded-lg border border-border bg-card">
          <div>
            <div className="t-sm font-medium">{t("orgSettings.notifications.received")}</div>
            <div className="t-xs text-muted-foreground mt-0.5">
              Notificar cuando se recibe un documento de un proveedor
            </div>
          </div>
          <button
            role="switch"
            aria-checked={form.notifyReceivedDocuments}
            onClick={() => setForm((f) => ({ ...f, notifyReceivedDocuments: !f.notifyReceivedDocuments }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              form.notifyReceivedDocuments ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                form.notifyReceivedDocuments ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {saveMutation.isError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <span className="t-sm text-destructive">Error al guardar. Intentá de nuevo.</span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
