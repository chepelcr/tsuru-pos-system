import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { usePermissions } from "@/hooks/useRbac";
import type { PreDeployment } from "@/hooks/useDeployments";

/** dd/MM/yyyy HH:mm — small local formatter (POS has no date-fns dependency). */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface DeploymentPendingCardProps {
  preDeployment: PreDeployment;
  publishing: boolean;
  onPublish: () => void;
}

/**
 * The single "ready to publish" pending-changes card on the Deployments page.
 * Re-skinned from the dashboard's pending `Card` — shadcn `Card`/`Badge` →
 * POS `.card`/`<Badge>`; `bg-yellow-500 text-white` → `warning` variant
 * (CLAUDE.md §3). The pre-deployment `message` is a translation key in the
 * source, so it is resolved through `t()`.
 */
export function DeploymentPendingCard({
  preDeployment,
  publishing,
  onPublish,
}: DeploymentPendingCardProps) {
  const { t } = useLanguage();
  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canPublish = !permsReady || can("storefront", "create", "deployments");

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-pill icon-pill-warning w-8 h-8 flex-shrink-0">
            <Icon name="clock" size={16} />
          </span>
          <span className="t-h4 !mb-0">{t("deployments.pending.title")}</span>
        </div>
        <Badge variant="warning">{t("deployments.pending.readyToPublish")}</Badge>
      </div>

      <p className="t-sm text-muted-foreground">{t(preDeployment.message)}</p>

      <div className="t-sm">
        <div className="t-xs text-muted-foreground mb-1">
          {t("deployments.pending.created")}
        </div>
        <div className="font-medium text-foreground">
          {formatDateTime(preDeployment.createdAt)}
        </div>
      </div>

      {canPublish && (
        <Button
          variant="primary"
          icon={publishing ? "refresh" : "upload"}
          className={`w-full ${publishing ? "[&_svg]:animate-spin" : ""}`}
          disabled={publishing}
          onClick={onPublish}
        >
          {publishing
            ? t("deployments.pending.publishing")
            : t("deployments.pending.publishButton")}
        </Button>
      )}
    </div>
  );
}
