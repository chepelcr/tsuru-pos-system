import { Badge } from "./Badge";
import { Icon } from "./Icon";

type SyncState = "online" | "offline" | "syncing";

interface SyncPillProps {
  state?: SyncState;
}

const stateMap = {
  online: { variant: "success" as const, icon: "wifi", label: "En línea" },
  offline: { variant: "warning" as const, icon: "wifiOff", label: "Offline" },
  syncing: { variant: "info" as const, icon: "refresh", label: "Sincronizando" },
};

export function SyncPill({ state = "online" }: SyncPillProps) {
  const m = stateMap[state] ?? stateMap.online;
  return (
    <Badge variant={m.variant} style={{ gap: 6 }}>
      <Icon name={m.icon} size={11} strokeWidth={2.4} />
      {m.label}
    </Badge>
  );
}
