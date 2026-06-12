import { Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductBulkBarProps {
  count: number;
  /** True when every product on the current page is selected. */
  allSelected: boolean;
  /** RBAC: show activate/deactivate (commercial/products update). */
  canUpdate?: boolean;
  /** RBAC: show delete (commercial/products delete). */
  canDelete?: boolean;
  onToggleSelectAll: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

export function ProductBulkBar({
  count,
  allSelected,
  canUpdate = true,
  canDelete = true,
  onToggleSelectAll,
  onActivate,
  onDeactivate,
  onDelete,
}: ProductBulkBarProps) {
  const { t } = useLanguage();
  return (
    <div className="mt-3 px-3.5 py-2.5 bg-primary/[0.08] rounded-lg flex items-center gap-2.5 flex-wrap">
      <span className="t-sm font-bold">
        {t("products.selected", { n: String(count) })}
      </span>
      <Button
        variant="ghost"
        size="xs"
        icon={allSelected ? "xCircle" : "checkCircle"}
        onClick={onToggleSelectAll}
      >
        {allSelected ? t("products.deselectAll") : t("products.selectAll")}
      </Button>
      <div className="flex-1" />
      {canUpdate && (
        <Button variant="outline" size="xs" icon="eye" onClick={onActivate}>
          {t("common.activate")}
        </Button>
      )}
      {canUpdate && (
        <Button variant="outline" size="xs" icon="eyeOff" onClick={onDeactivate}>
          {t("common.deactivate")}
        </Button>
      )}
      {canDelete && (
        <Button variant="outline" size="xs" icon="trash" onClick={onDelete}>
          {t("common.delete")}
        </Button>
      )}
    </div>
  );
}
