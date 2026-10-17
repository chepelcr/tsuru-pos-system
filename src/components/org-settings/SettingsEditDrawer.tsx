import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Drawer, Icon, Spinner } from "@/components/ui";

/** Shared edit surface; native form submission preserves each section's validation. */
export function SettingsEditDrawer({ open, onClose, title, icon, formId, isBusy, error, children }: {
  open: boolean; onClose: () => void; title: string; icon: string; formId: string;
  isBusy: boolean; error?: string; children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Drawer open={open} onClose={onClose} dismissible={!isBusy} closeLabel={t("common.close")}
      title={title} icon={icon} width={720}
      footer={<div className="flex justify-end gap-3 px-6 py-4">
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={isBusy}>{t("common.cancel")}</button>
        <button type="submit" form={formId} className="btn btn-primary btn-sm" disabled={isBusy}>
          {isBusy && <Spinner size={14} />}{t(isBusy ? "common.saving" : "common.save")}
        </button>
      </div>}
    >
      {open && <fieldset disabled={isBusy} className="min-w-0 p-6">
        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <Icon name="alertCircle" size={15} className="text-destructive flex-shrink-0 mt-0.5" />
          <span className="t-sm text-destructive">{error}</span>
        </div>}
        {children}
      </fieldset>}
    </Drawer>
  );
}
