import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { DeploymentStatus } from "@/hooks/useDeployments";

/**
 * Status badge + icon mapping for a deployment row.
 *
 * The dashboard burned literal palette classes (`bg-yellow-500`/`bg-green-500`/
 * `bg-red-500 text-white`). Here every status routes through a design-system
 * POS `<Badge>` variant + a curated `<Icon>` (CLAUDE.md §3):
 *   building  → primary-soft  (spinning)
 *   uploading → warning       (spinning)
 *   success   → success
 *   error     → destructive
 */
const STATUS_BADGE: Record<
  DeploymentStatus,
  { variant: "primary-soft" | "warning" | "success" | "destructive"; icon: string }
> = {
  building: { variant: "primary-soft", icon: "refresh" },
  uploading: { variant: "warning", icon: "upload" },
  success: { variant: "success", icon: "checkCircle" },
  error: { variant: "destructive", icon: "alertCircle" },
};

interface DeploymentStatusBadgeProps {
  status: DeploymentStatus;
}

/** True while the build is actively in flight (icon should spin). */
export function isDeploymentInFlight(status: DeploymentStatus): boolean {
  return status === "building" || status === "uploading";
}

export function DeploymentStatusBadge({ status }: DeploymentStatusBadgeProps) {
  const { t } = useLanguage();
  const { variant, icon } = STATUS_BADGE[status];

  return (
    <Badge variant={variant} className="inline-flex items-center gap-1.5">
      <Icon
        name={icon}
        size={12}
        className={isDeploymentInFlight(status) ? "animate-spin" : ""}
      />
      {t(`deployments.status.${status}`)}
    </Badge>
  );
}
