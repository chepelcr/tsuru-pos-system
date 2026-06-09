import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  DeploymentStatusBadge,
  isDeploymentInFlight,
} from "./DeploymentStatusBadge";
import type { DeploymentHistory } from "@/hooks/useDeployments";

/** dd/MM/yyyy HH:mm — small local formatter (POS has no date-fns dependency). */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Build duration in seconds (one decimal), or null when still running. */
function durationSeconds(deployment: DeploymentHistory): string | null {
  if (!deployment.completedAt) return null;
  const ms =
    new Date(deployment.completedAt).getTime() -
    new Date(deployment.startedAt).getTime();
  if (Number.isNaN(ms)) return null;
  return (ms / 1000).toFixed(1);
}

interface FieldProps {
  label: string;
  value: string;
  hint?: string;
}

function MetaField({ label, value, hint }: FieldProps) {
  return (
    <div>
      <div className="t-xs text-muted-foreground mb-1">{label}</div>
      <div className="t-sm font-medium text-foreground">{value}</div>
      {hint && <div className="t-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

interface DeploymentHistoryCardProps {
  deployment: DeploymentHistory;
}

/**
 * A single deployment row in the history tab. Re-skinned from the dashboard's
 * deployment `Card`:
 *   • status icon spins for `building`/`uploading` (CLAUDE.md allows
 *     `animate-spin`; colour comes from the design-system Badge token)
 *   • `bg-red-50/border-red-200/text-red-800` error panel → `bg-destructive/[…]`
 *     tokens; `bg-green-50/…` success panel → `bg-success/[…]` tokens (§3)
 *   • the "View site" button opens `deployUrl` in a new tab
 */
export function DeploymentHistoryCard({ deployment }: DeploymentHistoryCardProps) {
  const { t } = useLanguage();
  const duration = durationSeconds(deployment);
  const inFlight = isDeploymentInFlight(deployment.status);

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header: build id + status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="icon-pill icon-pill-muted w-8 h-8 flex-shrink-0">
            <Icon name="layers" size={16} className={inFlight ? "animate-spin" : ""} />
          </span>
          <span className="t-h4 !mb-0 truncate">
            {t("deployments.history.build", {
              id: deployment.buildId.slice(-6),
            })}
          </span>
        </div>
        <DeploymentStatusBadge status={deployment.status} />
      </div>

      {deployment.message && (
        <p className="t-sm text-muted-foreground">{deployment.message}</p>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetaField
          label={t("deployments.fields.started")}
          value={formatDateTime(deployment.startedAt)}
        />
        {deployment.completedAt && (
          <MetaField
            label={t("deployments.fields.completed")}
            value={formatDateTime(deployment.completedAt)}
            hint={
              duration
                ? t("deployments.fields.durationValue", { seconds: duration })
                : undefined
            }
          />
        )}
        {deployment.filesUploaded != null && (
          <MetaField
            label={t("deployments.fields.files")}
            value={String(deployment.filesUploaded)}
          />
        )}
        {deployment.buildSizeKb != null && (
          <MetaField
            label={t("deployments.fields.size")}
            value={t("deployments.fields.sizeValue", {
              mb: (deployment.buildSizeKb / 1024).toFixed(1),
            })}
          />
        )}
      </div>

      {/* Error panel */}
      {deployment.status === "error" && deployment.errorDetails && (
        <div className="rounded-md bg-destructive/[0.08] border border-destructive/30 p-3">
          <div className="t-sm font-medium text-destructive mb-1">
            {t("deployments.errorDetails")}
          </div>
          <div className="t-xs font-mono text-destructive break-words">
            {deployment.errorDetails}
          </div>
        </div>
      )}

      {/* Success panel */}
      {deployment.status === "success" && deployment.deployUrl && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-success/[0.08] border border-success/30 p-3 flex-wrap">
          <div className="t-sm text-success flex items-center gap-1.5">
            <Icon name="checkCircle" size={15} />
            {t("deployments.successMessage")}
          </div>
          <Button
            variant="outline"
            size="sm"
            iconRight="arrowRight"
            onClick={() => window.open(deployment.deployUrl, "_blank", "noopener")}
          >
            {t("deployments.viewSite")}
          </Button>
        </div>
      )}
    </div>
  );
}
