import { Boxes } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ProductFormState } from "@/types/productForm";

interface InventorySectionProps {
  form: ProductFormState;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onChange: (patch: Partial<ProductFormState>) => void;
}

export function InventorySection({
  form,
  isExpanded,
  onToggle,
  disabled,
  onChange,
}: InventorySectionProps) {
  const { t } = useLanguage();

  return (
    <SectionWrapper
      title={t("products.inventoryTitle")}
      icon={Boxes}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      <div>
        <FormLabel>{t("products.minStockLabel")}</FormLabel>
        <input
          type="number"
          className="pp-input"
          placeholder={t("products.minStockPlaceholder")}
          min={0}
          value={form.low_stock_threshold}
          onChange={(e) => onChange({ low_stock_threshold: e.target.value })}
        />
        <p className="t-xs mt-1 text-muted-foreground">
          {t("products.lowStockHint")}
        </p>
      </div>
    </SectionWrapper>
  );
}
