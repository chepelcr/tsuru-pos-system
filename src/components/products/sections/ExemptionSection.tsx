import { ShieldCheck } from "lucide-react";
import { FormLabel, Select } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllExemptions } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CountryISO,
  LOCAL_EXEMPTION_CODES,
  NC_ND_ONLY_EXEMPTION_CODES,
} from "@/lib/enums";

/**
 * The article's CATALOG-level exoneración (Nota 10.1).
 *
 * This is for a product that is *always* exonerated — a free-trade-zone good, an
 * article covered by a special law — and it is copied onto the IVA row of any
 * order line built from the product. A one-off exoneration for a single sale is
 * granted on the LINE instead, in the line-detail drawer, because it belongs to
 * that transaction rather than to the article.
 *
 * The columns have existed on `Product` and round-tripped through the types since
 * migration `u1c2d3e4f5a6`, but no form could edit them, so the data was
 * unreachable from the app (CALCULATION_AUDIT §"Exoneracion capture", TSR-124).
 *
 * `exemption_amount` is not edited here: `MontoExonerado` is derived as
 * `tax × rate / 100` against the line being billed, and a figure computed against
 * one unit would pin a multi-unit line's exonerated amount to one unit's — the
 * same trap `base_amount` sets.
 */
interface ExemptionSectionProps {
  authorizationCode: string;
  exemptedRate: string;
  exemptionNumber: string;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onChange: (patch: {
    exemptionAuthorizationCode?: string;
    exemptedRate?: string;
    exemptionNumber?: string;
  }) => void;
}

export function ExemptionSection({
  authorizationCode,
  exemptedRate,
  exemptionNumber,
  isExpanded,
  onToggle,
  disabled,
  onChange,
}: ExemptionSectionProps) {
  const { t } = useLanguage();
  const { data: exemptionTypes } = useAllExemptions({
    iso_code: CountryISO.COSTA_RICA,
  } as never);

  const hasExemption = !!authorizationCode.trim();
  const isLocal = LOCAL_EXEMPTION_CODES.includes(authorizationCode);
  const isNcNdOnly = NC_ND_ONLY_EXEMPTION_CODES.includes(authorizationCode);
  const rate = Number(exemptedRate);
  const rateOutOfRange =
    exemptedRate.trim() !== "" && (!Number.isFinite(rate) || rate < 0 || rate > 100);

  return (
    <SectionWrapper
      title={t("products.exemption.title")}
      icon={ShieldCheck}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      badge={hasExemption ? 1 : undefined}
    >
      <p className="t-xs text-muted-foreground mb-3">{t("products.exemption.hint")}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <FormLabel>{t("products.exemption.type")}</FormLabel>
          <Select
            value={authorizationCode}
            onChange={(e) => onChange({ exemptionAuthorizationCode: e.target.value })}
            disabled={disabled}
            className="pp-input pp-input-sm w-full"
          >
            <option value="">{t("products.exemption.none")}</option>
            {(exemptionTypes ?? []).map((ex: any) => (
              <option key={ex.code ?? ex.id} value={ex.code ?? ""}>
                {ex.code} — {ex.description}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <FormLabel>{t("products.exemption.rate")}</FormLabel>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={exemptedRate}
            onChange={(e) => onChange({ exemptedRate: e.target.value })}
            disabled={disabled || !hasExemption}
            className="pp-input pp-input-sm w-full"
          />
        </div>
      </div>

      {hasExemption && (
        <div className="space-y-1 mt-2">
          <FormLabel>{t("products.exemption.number")}</FormLabel>
          <input
            value={exemptionNumber}
            onChange={(e) => onChange({ exemptionNumber: e.target.value })}
            disabled={disabled}
            className="pp-input pp-input-sm w-full"
          />
          <p className="t-xs text-muted-foreground">{t("products.exemption.numberHint")}</p>
        </div>
      )}

      {isLocal && (
        <p className="t-xs text-info mt-2">{t("products.exemption.localWarning")}</p>
      )}
      {isNcNdOnly && (
        <p className="t-xs text-warning mt-2">{t("products.exemption.ncndWarning")}</p>
      )}
      {rateOutOfRange && (
        <p className="t-xs text-destructive mt-2">{t("products.exemption.rateRange")}</p>
      )}

      {hasExemption && (
        <button
          onClick={() =>
            onChange({
              exemptionAuthorizationCode: "",
              exemptedRate: "",
              exemptionNumber: "",
            })
          }
          disabled={disabled}
          className="t-xs text-muted-foreground hover:text-destructive mt-3"
        >
          {t("products.exemption.clear")}
        </button>
      )}
    </SectionWrapper>
  );
}
