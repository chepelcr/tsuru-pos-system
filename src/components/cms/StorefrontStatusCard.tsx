import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { useStorefrontStatus } from "@/hooks/useStorefrontStatus";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { Badge, Icon } from "@/components/ui";
import { ROUTES } from "@/routePaths";

/** Externally supplied links may only open an ordinary HTTPS site. */
export function safeStoreUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function StorefrontStatusCard({ userId, orgId, templateName }: {
  userId: string | undefined; orgId: string; templateName?: string;
}) {
  const { t } = useLanguage();
  const { can } = usePermissions();
  const allowed = can("storefront", "read", "deployments");
  const query = useStorefrontStatus(userId, orgId, allowed);
  // Shares the bell's hydrated query and single socket. Never opens a connection
  // or polls; a failed template update can coexist with an already live store.
  const { data: notifications } = useUserNotifications(allowed);
  if (!allowed) return null;

  const data = query.data;
  const status = data?.infrastructure_status;
  const known = status && ["not_published", "pending", "provisioning", "active", "failed", "deleting"].includes(status);
  const state = query.isError ? "unavailable" : query.isPending ? "loading" : known ? status : "unknown";
  const url = state === "active" ? safeStoreUrl(data?.store_url) : null;
  const latest = notifications?.data.filter((n) => n.organization_id === orgId && n.event_type.startsWith("storefront."))
    .sort((a, b) => Date.parse(b.created_on ?? "") - Date.parse(a.created_on ?? ""))[0];
  const update = latest && Date.parse(latest.created_on ?? "") >= Date.parse(data?.infrastructure_updated_at ?? "1970-01-01")
    ? latest : null;
  const stage = typeof update?.payload?.stage === "string" && ["provisioning", "applying", "ready", "applied", "failed"].includes(update.payload.stage)
    ? update.payload.stage : null;

  return (
    <section aria-label={t("storefront.status.title")} className="card p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-h4 flex items-center gap-2"><Icon name="store" size={20} />{t("storefront.status.title")}</h2>
        <Badge variant="outline">
          {t(`storefront.status.${state}`)}
        </Badge>
      </div>
      <p className="t-sm text-muted-foreground mt-2" role="status">{t(`storefront.status.${state}Description`)}</p>
      {data?.template_id && <p className="t-sm mt-2">{t("storefront.status.design", { name: templateName ?? t("storefront.status.selectedDesign") })}</p>}
      {stage && <p className={`t-sm mt-2 ${stage === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
        {t(`storefront.status.update.${stage}`)}
      </p>}
      <div className="flex flex-wrap gap-2 mt-4">
        {url && <a className="btn btn-outline min-h-11 font-semibold" href={url} target="_blank" rel="noopener noreferrer">{t("storefront.status.open")}</a>}
        {can("storefront", "read", "content") && <a className="btn btn-outline min-h-11" href={ROUTES.DASHBOARD_CONTENT}>{t("storefront.status.edit")}</a>}
        <button type="button" className="btn btn-ghost min-h-11" disabled={query.isFetching} onClick={() => void query.refetch()}>
          <Icon name="refresh" size={16} />{t("storefront.status.refresh")}
        </button>
      </div>
    </section>
  );
}
