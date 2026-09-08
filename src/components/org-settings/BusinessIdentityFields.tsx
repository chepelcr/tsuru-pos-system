import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon, SelectField, type SelectFieldOption } from "@/components/ui";
import { BUSINESS_TYPES, type BusinessType } from "@/types/organization";

export interface BusinessIdentityValue {
  businessType: BusinessType;
  isRetailSupplier: boolean;
  isPyme: boolean;
}

interface BusinessIdentityFieldsProps {
  value: BusinessIdentityValue;
  onChange: (patch: Partial<BusinessIdentityValue>) => void;
  disabled?: boolean;
  /** Render the "you'll start with…" summary (used by the creation wizard). */
  showSummary?: boolean;
  /** Reveal the classification toggles only once a type is chosen (wizard). */
  progressive?: boolean;
}

/**
 * Business identity: ONE exclusive select plus TWO independent toggles.
 *
 * Shared by org settings and the creation wizard so the copy — especially the
 * supplier note, which is a promise about features — is written once.
 *
 * The two flags are deliberately NOT values of the select. A minisuper can be
 * a PYME *and* supply a retail chain; business type holds one value, so folding
 * them in would make that combination unrepresentable. They are visually
 * detached under their own heading for the same reason: neither should read as
 * another kind of business.
 */
export function BusinessIdentityFields({
  value,
  onChange,
  disabled,
  showSummary = false,
  progressive = false,
}: BusinessIdentityFieldsProps) {
  const { t } = useLanguage();

  const options: SelectFieldOption[] = useMemo(
    () =>
      BUSINESS_TYPES.map((code) => ({
        value: code,
        label: t(`businessType.${code}`),
        hint: t(`businessType.${code}.hint`),
      })),
    [t],
  );

  // Derived from the selected type's own hint rather than a second hardcoded
  // list, so the summary can never drift from what the picker promises.
  const summary = useMemo(() => {
    const parts = [t("businessType.summary.base")];
    if (value.businessType !== "general") {
      parts.push(t(`businessType.${value.businessType}.hint`).toLowerCase());
    }
    if (value.isRetailSupplier) {
      parts.push(t("businessType.supplier.hint").toLowerCase());
    }
    return parts.join(" · ");
  }, [t, value.businessType, value.isRetailSupplier]);

  // In the wizard the toggles wait for a type; in settings everything shows.
  const showToggles = !progressive || !!value.businessType;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="pp-label" htmlFor="business-type">
          {t("businessType.label")}
        </label>
        <SelectField
          id="business-type"
          value={value.businessType}
          options={options}
          disabled={disabled}
          searchThreshold={0}
          onChange={(next) => onChange({ businessType: next as BusinessType })}
        />
        <p className="t-xs text-muted-foreground">{t("businessType.help")}</p>
      </div>

      {showToggles && (
        <div className={progressive ? "space-y-2 fade-up" : "space-y-2"}>
          <div className="label-section">{t("businessType.classifications")}</div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.isRetailSupplier}
              disabled={disabled}
              onChange={(e) => onChange({ isRetailSupplier: e.target.checked })}
            />
            <span className="min-w-0">
              <span className="block t-sm font-semibold">{t("businessType.supplier")}</span>
              <span className="block t-xs text-muted-foreground">
                {t("businessType.supplier.hint")}
              </span>
            </span>
          </label>

          {/* The supplier toggle is the one switch that visibly changes the
              Pedidos module, so it states what it grants — in place, only once
              it is on. */}
          {value.isRetailSupplier && (
            <div className="ml-6 flex items-start gap-2 p-2.5 rounded-md bg-primary/[0.06] border border-primary/20 fade-up">
              <Icon name="info" size={13} className="text-primary mt-0.5 flex-shrink-0" />
              <span className="t-xs">{t("businessType.supplier.unlocks")}</span>
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.isPyme}
              disabled={disabled}
              onChange={(e) => onChange({ isPyme: e.target.checked })}
            />
            <span className="min-w-0">
              <span className="block t-sm font-semibold">{t("businessType.pyme")}</span>
              {/* No "unlocks…" copy: PYME grants nothing. Describing it is
                  honest; promising a capability would not be. */}
              <span className="block t-xs text-muted-foreground">
                {t("businessType.pyme.hint")}
              </span>
            </span>
          </label>
        </div>
      )}

      {showSummary && showToggles && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 fade-up">
          <Icon name="check" size={13} className="text-success mt-0.5 flex-shrink-0" />
          <span className="t-xs">
            <span className="font-semibold">{t("businessType.summary")} </span>
            {summary}
          </span>
        </div>
      )}
    </div>
  );
}
