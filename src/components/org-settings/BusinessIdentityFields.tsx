import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon, SelectField, type SelectFieldOption } from "@/components/ui";
import { BUSINESS_TYPES, type BusinessType } from "@/types/organization";

export interface BusinessIdentityValue {
  business_type: BusinessType;
  is_retail_supplier: boolean;
  is_pyme: boolean;
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
    if (value.business_type !== "general") {
      parts.push(t(`businessType.${value.business_type}.hint`).toLowerCase());
    }
    return parts.join(" · ");
    // No longer mentions the retail-supplier flag: the toggle that set it is
    // gone, so the summary would describe a capability the user can no longer
    // see or change.
  }, [t, value.business_type]);

  // In the wizard the toggles wait for a type; in settings everything shows.
  const showToggles = !progressive || !!value.business_type;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="pp-label" htmlFor="business-type">
          {t("businessType.label")}
        </label>
        <SelectField
          id="business-type"
          value={value.business_type}
          options={options}
          disabled={disabled}
          searchThreshold={0}
          onChange={(next) => onChange({ business_type: next as BusinessType })}
        />
        <p className="t-xs text-muted-foreground">{t("businessType.help")}</p>
      </div>

      {showToggles && (
        <div className={progressive ? "space-y-2 fade-up" : "space-y-2"}>
          <div className="label-section">{t("businessType.classifications")}</div>

          {/* The "Proveedor de cadena" toggle used to live here, and the
              Pedidos module keyed its chain behaviour on it. It was the wrong
              question to ask: whether a DOCUMENT needs a purchasing department
              and a registered delivery point depends on the CUSTOMER being a
              chain, not on us having ticked a box about ourselves — and the
              answer was the same for every one of an org's customers, corner
              shop included. Chains are recognised by the client's
              identification instead (`lib/chainClients`), so the capability
              turns itself on for the clients that need it and stays out of the
              way for the rest. Nothing to keep in sync, nothing to forget. */}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.is_pyme}
              disabled={disabled}
              onChange={(e) => onChange({ is_pyme: e.target.checked })}
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
