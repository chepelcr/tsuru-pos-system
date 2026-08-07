import { Card, Menu, Badge } from "@/components/ui";
import type { MenuItem } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import type { Store } from "@/types";

interface StoreCardProps {
  store: Store;
  onEdit: (store: Store) => void;
  onStatusChange: (storeId: string, status: number) => void;
  delay?: number;
}

function statusBadge(status: number | undefined, t: (k: string) => string) {
  switch (status) {
    case 1:
      return <Badge variant="success">{t("stores.statusActive")}</Badge>;
    case 2:
      return <Badge variant="secondary">{t("stores.statusInactive")}</Badge>;
    case 3:
      return <Badge variant="destructive">{t("stores.statusDeleted")}</Badge>;
    default:
      return null;
  }
}

export function StoreCard({ store, onEdit, onStatusChange, delay = 0 }: StoreCardProps) {
  const { t } = useLanguage();
  const isDeleted = store.status === 3;

  // RBAC action gating — stores inherit commercial/clients tuples (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("commercial", "update", "clients");
  const canDelete = !permsReady || can("commercial", "delete", "clients");

  const menuItems: MenuItem[] = [
    { label: t("common.edit"), icon: "edit", action: () => onEdit(store), hidden: !canUpdate },
    {
      label: t("common.activate"),
      icon: "checkCircle",
      action: () => onStatusChange(store.store_id, 1),
      hidden: store.status !== 2 || !canUpdate,
    },
    {
      label: t("common.deactivate"),
      icon: "xCircle",
      action: () => onStatusChange(store.store_id, 2),
      hidden: store.status !== 1 || !canUpdate,
    },
    {
      label: t("common.delete"),
      icon: "trash",
      color: "hsl(var(--destructive))",
      action: () => onStatusChange(store.store_id, 3),
      hidden: !canDelete,
    },
  ];

  return (
    <Card className="card-hover px-4 py-3.5 fade-up" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="t-num text-sm font-bold text-foreground">{store.store_code}</span>
            {statusBadge(store.status, t)}
          </div>
          {store.store_name && (
            <p className="t-sm text-foreground truncate">{store.store_name}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 t-xs text-muted-foreground">
            {store.chain && (
              <span>{t("stores.fields.chain")}: {store.chain}</span>
            )}
            {store.slot_id && (
              <span>{t("stores.fields.slotId")}: {store.slot_id}</span>
            )}
            {store.gln && (
              <span className="t-num">{t("stores.fields.gln")}: {store.gln}</span>
            )}
          </div>
        </div>

        {!isDeleted && (canUpdate || canDelete) && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Menu align="right" items={menuItems} />
          </div>
        )}
      </div>
    </Card>
  );
}
