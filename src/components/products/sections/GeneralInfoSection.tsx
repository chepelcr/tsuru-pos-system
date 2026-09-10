import { useState } from "react";
import { Package } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel, Select } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAllMeasurementUnits } from "@/hooks/useDataApi";
import type { Category } from "@/types";
import { DEFAULT_UNIT_MEASURE } from "@/types/productForm";
import type { ProductFormState } from "@/types/productForm";

/** Sentinel for the free-text unit, matching the line detail's "Otros". */
const OTHER_UNIT = "Otros";

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
  const [customUnit, setCustomUnit] = useState(form.unitMeasure === OTHER_UNIT);

  const units = unitsData ?? [];

  return (
    <SectionWrapper
      title={t("products.generalInfo") || "Información General"}
      icon={Package}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <FormLabel required>{t("common.name")}</FormLabel>
        <input
          className="pp-input"
          placeholder={t("products.namePlaceholder")}
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div>
        <FormLabel>{t("common.description")}</FormLabel>
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
        <Select
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
        </Select>
      </div>

      {/* Unit of measure.
          This control was rendered but never connected: the <Select> had no
          `value` and its onChange only flipped local state, and the free-text
          input had neither. So the field could not be set at all, every product
          saved without a `unit_measure`, and the invoice built from it fell
          back to "Unid" — wrong for anything sold by weight or volume, and
          Hacienda requires `UnidadMedida` on every line.
          It stores the Hacienda CODE (not the catalog id) and mirrors the
          commercial unit, exactly as the line-detail drawer does. */}
      {units.length > 0 && (
        <div>
          <FormLabel required>{t("products.unitOfMeasure")}</FormLabel>
          {!customUnit ? (
            <Select
              className="pp-input"
              value={form.unitMeasure}
              onChange={(e) => {
                const value = e.target.value;
                if (value === OTHER_UNIT) {
                  setCustomUnit(true);
                  onChange({ unitMeasure: OTHER_UNIT, commercialUnitMeasure: "" });
                  return;
                }
                // Outside "Otros" the commercial unit simply mirrors the code,
                // so the two never disagree on an ordinary article.
                onChange({ unitMeasure: value, commercialUnitMeasure: value });
              }}
            >
              {units.map((u: { id: number; description: string; code?: string }) => (
                <option key={u.id} value={u.code ?? String(u.id)}>
                  {u.description}{u.code ? ` (${u.code})` : ""}
                </option>
              ))}
              <option value={OTHER_UNIT}>{t("products.otherUnit")}</option>
            </Select>
          ) : (
            <div className="flex gap-1.5">
              <input
                className="pp-input flex-1"
                placeholder={t("products.specifyUnit")}
                value={form.commercialUnitMeasure}
                onChange={(e) => onChange({ commercialUnitMeasure: e.target.value })}
                maxLength={20}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm text-xs"
                onClick={() => {
                  setCustomUnit(false);
                  // Back to the default rather than to nothing — an empty unit
                  // is not a legal document line.
                  onChange({
                    unitMeasure: DEFAULT_UNIT_MEASURE,
                    commercialUnitMeasure: DEFAULT_UNIT_MEASURE,
                  });
                }}
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
