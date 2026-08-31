import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { useLanguage } from "@/contexts/LanguageContext";

type SyncState = "online" | "offline" | "syncing" | "pending" | "error" | "preparing";

interface SyncPillProps {
  state?: SyncState;
}

const stateMap = {
  online: { variant: "success" as const, icon: "wifi", labelKey: "sync.online" },
  offline: { variant: "warning" as const, icon: "wifiOff", labelKey: "sync.offline" },
  syncing: { variant: "info" as const, icon: "refresh", labelKey: "sync.syncing" },
  pending: { variant: "warning" as const, icon: "clock", labelKey: "sync.pending" },
  error: { variant: "destructive" as const, icon: "alertTri", labelKey: "sync.error" },
  preparing: { variant: "info" as const, icon: "download", labelKey: "sync.preparing" },
};

export function SyncPill({ state = "online" }: SyncPillProps) {
  const { t } = useLanguage();
  const m = stateMap[state] ?? stateMap.online;
  return (
    <Badge variant={m.variant} className="gap-1.5">
      <Icon name={m.icon} size={11} strokeWidth={2.4} />
      {t(m.labelKey)}
    </Badge>
  );
}
