import { useState } from "react";
import { Package } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAllMeasurementUnits } from "@/hooks/useDataApi";
import type { Category } from "@/types";
import type { ProductFormState } from "@/types/productForm";

interface GeneralInfoSectionProps {
  form: ProductFormState;
  categories: Category[];
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ProductFormState>) => void;
}

export function GeneralInfoSection({
  form,
  categories,
  isExpanded,
  onToggle,
  onChange,
}: GeneralInfoSectionProps) {
  const { t } = useLanguage();
  const { data: unitsData } = useAllMeasurementUnits();
  const [customUnit, setCustomUnit] = useState(false);

  const units = unitsData ?? [];

  return (
    <SectionWrapper
      title={t("products.generalInfo") || "Información General"}
      icon={Package}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <FormLabel required>{t("products.name")}</FormLabel>
        <input
          className="pp-input"
          placeholder={t("products.namePlaceholder")}
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div>
        <FormLabel>{t("products.description")}</FormLabel>
        <textarea
          className="pp-input resize-y"
          rows={2}
          placeholder={t("products.descriptionPlaceholder")}
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div>
        <FormLabel required>{t("products.categoryLabel")}</FormLabel>
        <select
          className="pp-input"
          value={form.category_id}
          onChange={(e) => onChange({ category_id: e.target.value })}
        >
          <option value="">{t("products.noCategory")}</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {units.length > 0 && (
        <div>
          <FormLabel>{t("products.unitOfMeasure")}</FormLabel>
          {!customUnit ? (
            <select
              className="pp-input"
              onChange={(e) => {
                if (e.target.value === "__other__") {
                  setCustomUnit(true);
                }
              }}
            >
              <option value="">{t("products.selectUnit")}</option>
              {units.map((u: { id: number; description: string; code?: string }) => (
                <option key={u.id} value={String(u.id)}>
                  {u.description}{u.code ? ` (${u.code})` : ""}
                </option>
              ))}
              <option value="__other__">{t("products.otherUnit")}</option>
            </select>
          ) : (
            <div className="flex gap-1.5">
              <input
                className="pp-input flex-1"
                placeholder={t("products.specifyUnit")}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm text-xs"
                onClick={() => setCustomUnit(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <ToggleRow
          label={t("products.trackInventory")}
          description={t("products.trackInventoryDesc")}
          checked={form.track_inventory}
          onChange={(v) => onChange({ track_inventory: v })}
        />
        <ToggleRow
          label={t("products.fiscalInfo")}
          description={t("products.fiscalInfoDesc")}
          checked={form.has_fiscal_info}
          onChange={(v) => onChange({ has_fiscal_info: v })}
        />
        <ToggleRow
          label={t("products.packageInfo")}
          description={t("products.packageInfoDesc")}
          checked={form.has_package_info}
          onChange={(v) => onChange({ has_package_info: v })}
        />
      </div>
    </SectionWrapper>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-muted/35 rounded-lg">
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="t-xs text-muted-foreground">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-[18px] h-[18px] cursor-pointer accent-primary"
      />
    </div>
  );
}
