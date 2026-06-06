import { Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductBulkBarProps {
  count: number;
  onDelete: () => void;
}

export function ProductBulkBar({ count, onDelete }: ProductBulkBarProps) {
  const { t } = useLanguage();
  return (
    <div className="mt-3 px-3.5 py-2.5 bg-primary/[0.08] rounded-lg flex items-center gap-2.5">
      <span className="t-sm font-bold">
        {t("products.selected", { n: String(count) })}
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="xs" icon="eye">{t("common.activate")}</Button>
      <Button variant="outline" size="xs" icon="eyeOff">{t("common.deactivate")}</Button>
      <Button variant="outline" size="xs" icon="trash" onClick={onDelete}>{t("common.delete")}</Button>
    </div>
  );
}
