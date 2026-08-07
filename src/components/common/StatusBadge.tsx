import { Badge } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  showDot?: boolean;
}

export function StatusBadge({ active, activeLabel, inactiveLabel, showDot = true }: StatusBadgeProps) {
  const { t } = useLanguage();
  const resolvedActive = activeLabel ?? t("common.active");
  const resolvedInactive = inactiveLabel ?? t("common.inactive");

  return (
    <div className="flex items-center gap-1.5">
      {showDot && (
        <span className={`status-dot status-dot-${active ? "success" : "warning"}`} />
      )}
      <Badge variant={active ? "success" : "secondary"}>
        {active ? resolvedActive : resolvedInactive}
      </Badge>
    </div>
  );
}
