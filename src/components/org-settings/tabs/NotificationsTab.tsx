import { Icon, Badge, EmptyState } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgConfiguration } from "@/types/orgConfigurations";

interface NotificationsTabProps {
  config: OrgConfiguration | null | undefined;
  isLoading: boolean;
  /** Undefined when the user lacks organization/update/notifications — edit triggers hide. */
  onEdit?: () => void;
}

const SENT_DOCS_LABELS: Record<number, string> = {
  1: "orgSettings.notifications.sentOpts.1",
  2: "orgSettings.notifications.sentOpts.2",
  3: "orgSettings.notifications.sentOpts.3",
  4: "orgSettings.notifications.sentOpts.4",
};

export function NotificationsTab({ config, isLoading, onEdit }: NotificationsTabProps) {
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

  const hasNotifications = config !== null && config?.notificationSettings != null;

  if (!hasNotifications) {
    return (
      <div className="p-6">
        <EmptyState
          icon="sliders"
          title={t("orgSettings.notifications.empty.title")}
          description={t("orgSettings.notifications.empty.desc")}
          action={
            onEdit && (
              <button className="btn btn-primary btn-sm" onClick={onEdit}>
                <Icon name="plus" size={14} />
                {t("orgSettings.notifications.configure")}
              </button>
            )
          }
        />
      </div>
    );
  }

  const ns = config!.notificationSettings!;

  return (
    <div className="p-6">
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="icon-pill w-9 h-9 icon-pill-info">
              <Icon name="sliders" size={16} />
            </div>
            <div>
              <div className="t-h4">Configuración de notificaciones</div>
              <div className="t-xs text-muted-foreground">Alertas sobre el estado de tus comprobantes</div>
            </div>
          </div>
          {onEdit && (
            <button className="btn btn-outline btn-sm" onClick={onEdit}>
              <Icon name="edit" size={13} />
              {t("orgSettings.notifications.edit")}
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="t-sm text-muted-foreground">{t("orgSettings.notifications.callbackUrl")}</span>
            <span className="t-sm font-medium truncate max-w-[280px]">
              {ns.callbackUrl || <span className="text-muted-foreground italic">No configurado</span>}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="t-sm text-muted-foreground">{t("orgSettings.notifications.sentDocuments")}</span>
            <span className="t-sm font-medium">
              {t(SENT_DOCS_LABELS[ns.notifySentDocuments] ?? "orgSettings.notifications.sentOpts.4")}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="t-sm text-muted-foreground">{t("orgSettings.notifications.processing")}</span>
            <Badge variant={ns.notifyProcessingDocuments ? "success" : "secondary"}>
              {ns.notifyProcessingDocuments ? "Sí" : "No"}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="t-sm text-muted-foreground">{t("orgSettings.notifications.received")}</span>
            <Badge variant={ns.notifyReceivedDocuments ? "success" : "secondary"}>
              {ns.notifyReceivedDocuments ? "Sí" : "No"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
