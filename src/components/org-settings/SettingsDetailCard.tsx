import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge, Icon } from "@/components/ui";

export function SettingsDetailCard({ title, icon, configured = true, onEdit, children }: {
  title: string; icon: string; configured?: boolean; onEdit?: () => void; children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <section className="card p-5" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="icon-pill icon-pill-primary-soft w-9 h-9 flex-shrink-0"><Icon name={icon} size={18} /></div>
          <div className="min-w-0">
            <h2 className="t-h4 !mb-1">{title}</h2>
            <Badge variant={configured ? "success" : "secondary"}>
              {t(configured ? "orgSettings.badge.configured" : "orgSettings.badge.pending")}
            </Badge>
          </div>
        </div>
        {onEdit && <button type="button" className="btn btn-outline btn-sm" onClick={onEdit}>
          <Icon name="edit" size={14} />{t("common.edit")}
        </button>}
      </div>
      {!configured && <p className="t-sm text-muted-foreground mb-4">{t("orgSettings.details.empty")}</p>}
      {children}
    </section>
  );
}

export function SettingsDetailRow({ label, value }: { label: string; value?: ReactNode }) {
  const { t } = useLanguage();
  const empty = value == null || value === "";
  return (
    <div className="grid grid-cols-1 gap-1 py-3 border-b border-border last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-5">
      <dt className="t-sm text-muted-foreground">{label}</dt>
      <dd className={`t-sm min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] ${empty ? "text-muted-foreground" : "font-medium"}`}>
        {empty ? t("orgSettings.details.notConfigured") : value}
      </dd>
    </div>
  );
}
