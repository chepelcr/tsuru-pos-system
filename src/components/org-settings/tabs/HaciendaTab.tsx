import { Icon, Badge, EmptyState } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgConfiguration } from "@/types/orgConfigurations";

interface HaciendaTabProps {
  config: OrgConfiguration | null | undefined;
  isLoading: boolean;
  onEdit: () => void;
}

function certExpiryStatus(expirationDate: string): "expired" | "soon" | "ok" {
  const exp = new Date(expirationDate);
  const now = new Date();
  const daysLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 30) return "soon";
  return "ok";
}

export function HaciendaTab({ config, isLoading, onEdit }: HaciendaTabProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-block h-12 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // `null` here means the BE returned a 404 (no configuration saved yet);
  // `undefined` means the query result hasn't materialised (e.g. an early
  // render before `enabled` flips true). Both should land the user in the
  // empty state so the rest of the component can read `config!.*` safely.
  if (!config) {
    return (
      <div className="p-6">
        <EmptyState
          icon="lock"
          title={t("orgSettings.hacienda.empty.title")}
          description={t("orgSettings.hacienda.empty.desc")}
          action={
            <button className="btn btn-primary btn-sm" onClick={onEdit}>
              <Icon name="plus" size={14} />
              {t("orgSettings.hacienda.configure")}
            </button>
          }
        />
      </div>
    );
  }

  const statusLabel = config.status === 1
    ? t("orgSettings.hacienda.statusActive")
    : t("orgSettings.hacienda.statusInactive");
  const statusVariant = config.status === 1 ? "success" : "secondary";

  return (
    <div className="p-6 space-y-4">
      {/* Credentials card */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="icon-pill w-9 h-9 icon-pill-primary-soft">
              <Icon name="lock" size={16} />
            </div>
            <div>
              <div className="t-h4">Credenciales Hacienda</div>
              <div className="t-xs text-muted-foreground">Acceso a la API de Ministerio de Hacienda</div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onEdit}>
            <Icon name="edit" size={13} />
            {t("orgSettings.hacienda.edit")}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="t-sm text-muted-foreground">{t("orgSettings.hacienda.username")}</span>
            <span className="t-sm font-medium">{config.username}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="t-sm text-muted-foreground">{t("orgSettings.hacienda.password")}</span>
            <span className="t-sm font-medium tracking-widest text-muted-foreground">••••••••</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="t-sm text-muted-foreground">{t("orgSettings.hacienda.status")}</span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </div>
      </div>

      {/* Certificate card */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="icon-pill w-9 h-9 icon-pill-muted">
            <Icon name="fileText" size={16} />
          </div>
          <div>
            <div className="t-h4">{t("orgSettings.hacienda.certificate")}</div>
            <div className="t-xs text-muted-foreground">Certificado digital PKCS12 (.p12)</div>
          </div>
        </div>

        {config.certificate ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="t-sm text-muted-foreground">Nombre</span>
              <span className="t-sm font-medium">{config.certificate.name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="t-sm text-muted-foreground">Alias</span>
              <span className="t-sm font-medium">{config.certificate.alias}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="t-sm text-muted-foreground">{t("orgSettings.hacienda.certExpiry")}</span>
              <div className="flex items-center gap-2">
                <span className="t-sm font-medium">
                  {new Date(config.certificate.expirationDate).toLocaleDateString()}
                </span>
                {certExpiryStatus(config.certificate.expirationDate) === "expired" && (
                  <Badge variant="destructive">{t("orgSettings.hacienda.certExpired")}</Badge>
                )}
                {certExpiryStatus(config.certificate.expirationDate) === "soon" && (
                  <Badge variant="warning">{t("orgSettings.hacienda.certExpiringSoon")}</Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="t-sm text-muted-foreground">No hay certificado cargado</p>
        )}
      </div>
    </div>
  );
}
