import { useEffect, useMemo } from "react";
import { Percent, AlertTriangle } from "lucide-react";
import { FormLabel, Icon, Select } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import {
  useAllTaxes,
  useAllTaxRates,
  useAllTaxFactors,
  useAllFactoryTaxCharges,
} from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CountryISO,
  IvaCollectedFactory,
  TaxRateCode,
  TaxTypeCode,
  isRateCodeAllowedFor,
} from "@/lib/enums";
import { isIvaCode, type FiscalMode } from "@/lib/fiscalForm";
import { formatMoney as fmt } from "@/lib/money";
import type {
  GetAllFactoryTaxChargesParams,
  TaxResponse,
  TaxRateResponse,
  TaxFactorResponse,
  FactoryTaxChargeResponse,
} from "@/services/data-api/dtos";
import type { LineTax } from "@/types/lineDetail";

const ISO = CountryISO.COSTA_RICA;
const VALID_TAX_RATE_CODES: readonly string[] = Object.values(TaxRateCode);

const LABELS = {
  product: {
    title: "products.iva",
    add: "products.addIva",
    factor: "products.ivarbuFactor",
    selectFactor: "products.selectFactor",
    factoryCharge: "products.factoryTaxCharge",
    noFactoryCharge: "products.noFactoryCharge",
  },
  line: {
    title: "lineDetail.taxesIvaTitle",
    add: "lineDetail.addIva",
    factor: "lineDetail.ivarbu",
    selectFactor: "lineDetail.selectFactor",
    factoryCharge: "lineDetail.factoryCharge",
    noFactoryCharge: "lineDetail.noFactoryCharge",
  },
} as const;

interface IvaTaxSectionProps {
  mode: FiscalMode;
  /** The whole tax list; this section edits only its IVA-family entries. */
  taxes: LineTax[];
  onChange: (taxes: LineTax[]) => void;
  /** The IVA base (after discounts and specific excises) — previews each IVA's amount. */
  baseAmount: number;
  /** Net subtotal after the discount cascade — the floor for an IVACE (07) base. */
  subtotalAfterDiscount: number;
  /** Hacienda factory-tax-charge code (IVACobradoFabrica). */
  factoryChargeCode?: string;
  onFactoryChargeChange: (code: string | undefined) => void;
  factoryAssumedTax?: number;
  /** The editable base for IVACE (07) or a factory charge. */
  manualBase?: number;
  onManualBaseChange: (value: number | undefined) => void;
  /**
   * Hacienda document type. Gates the transitional rate codes (05/06/07),
   * legal only on a credit or debit note. A PRODUCT is not a document, so in
   * product mode they are never offered: a default that guarantees a rejection
   * on the first invoice the product appears on is no default.
   */
  documentType?: string;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** The rules store-be enforces on save, surfaced so the drawer can block it. */
  onValidationChange?: (errors: string[]) => void;
}

export function IvaTaxSection({
  mode,
  taxes,
  onChange,
  baseAmount,
  subtotalAfterDiscount,
  factoryChargeCode,
  onFactoryChargeChange,
  factoryAssumedTax = 0,
  manualBase,
  onManualBaseChange,
  documentType,
  isExpanded,
  onToggle,
  disabled,
  onValidationChange,
}: IvaTaxSectionProps) {
  const { t } = useLanguage();
  const labels = LABELS[mode];
  const { data: taxesData } = useAllTaxes({ iso_code: ISO });
  const { data: taxRatesData } = useAllTaxRates({ iso_code: ISO });
  const { data: taxFactorsData } = useAllTaxFactors({ iso_code: ISO });
  // document_version_id is auto-injected by the data API client via DocumentVersionProvider
  const { data: factoryChargesData } = useAllFactoryTaxCharges(
    { iso_code: ISO } as GetAllFactoryTaxChargesParams,
  );

  const allTaxTypes: TaxResponse[] = taxesData ?? [];
  const rateList: TaxRateResponse[] = (taxRatesData ?? []).filter((r) =>
    isRateCodeAllowedFor(r.code ?? "", mode === "product" ? undefined : documentType),
  );
  const factorList: TaxFactorResponse[] = taxFactorsData ?? [];
  const factoryCharges: FactoryTaxChargeResponse[] = factoryChargesData ?? [];

  const ivaTaxTypes = allTaxTypes.filter((tt) => isIvaCode(tt.code));
  const ivaTaxes = useMemo(() => taxes.filter((tx) => isIvaCode(tx.code)), [taxes]);
  const hasIvace = ivaTaxes.some((tx) => tx.code === TaxTypeCode.IVACE);
  const showManualBase = hasIvace || !!factoryChargeCode;
  // IVACE Nota 7: the entered base must cover at least the discounted subtotal.
  const ivaceBaseTooLow = hasIvace && (manualBase ?? 0) < subtotalAfterDiscount;

  const selectedCharge = factoryCharges.find((c) => c.code === factoryChargeCode);

  const updateIva = (code: string, patch: Partial<LineTax>) =>
    onChange(taxes.map((tx) => (tx.code === code ? { ...tx, ...patch } : tx)));

  const removeIva = (code: string) => onChange(taxes.filter((tx) => tx.code !== code));

  const addIva = (code: string) => {
    if (!ivaTaxTypes.some((tt) => tt.code === code)) return;
    const defaultRate = rateList[0];
    onChange([
      ...taxes,
      {
        code,
        rate: defaultRate?.percentage ?? 13,
        rate_code: defaultRate?.code,
        special_fields: {},
      },
    ]);
  };

  // What store-be checks at save time, told while the field that fixes it is
  // on screen:
  //   * the IVA family is priced from its rate CODE, not its percentage;
  //   * code 08 is priced as `subtotal x factor`, so with no factor the line is
  //     taxed at zero — silently, all the way onto the document;
  //   * a rate code the Hacienda enum does not know (a catalog drift).
  useEffect(() => {
    if (!onValidationChange) return;
    const errors: string[] = [];
    for (const tax of ivaTaxes) {
      const isIvarbu = tax.code === TaxTypeCode.IVARBU;
      if (!isIvarbu && !tax.rate_code) errors.push(t("products.error.rateCodeRequired"));
      if (tax.rate_code && !VALID_TAX_RATE_CODES.includes(tax.rate_code)) {
        errors.push(t("lineDetail.iva.rateCodeInvalid", { code: tax.rate_code }));
      }
      if (isIvarbu && tax.factor === undefined) errors.push(t("products.error.factorRequired"));
    }
    onValidationChange(errors);
  }, [ivaTaxes, onValidationChange, t]);

  return (
    <SectionWrapper
      title={t(labels.title)}
      icon={Percent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      badge={ivaTaxes.length > 0 ? ivaTaxes.length : undefined}
    >
      <div className="flex flex-col gap-2">
        {ivaTaxes.map((tax) => {
          const typeRow = allTaxTypes.find((tt) => tt.code === tax.code);
          const isIvarbu = tax.code === TaxTypeCode.IVARBU;
          const ivaAmount = baseAmount > 0 && tax.rate ? (baseAmount * tax.rate) / 100 : 0;

          return (
            <div key={tax.code} className="px-3 py-2.5 bg-muted/30 rounded-lg border border-border">
              <div className={`flex items-center gap-2 ${isIvarbu ? "mb-2" : ""}`}>
                <div className="flex-1 text-[13px] font-semibold">
                  {typeRow?.description ?? t(labels.title)}
                </div>

                {!isIvarbu && (
                  <Select
                    className="pp-input w-[150px] !h-auto !px-2 !py-1 text-[13px]"
                    // Bound to the Hacienda rate CODE, not the data-services row
                    // id: the code identifies the treatment and is what the
                    // document carries; the row id can change on a reseed.
                    value={tax.rate_code ?? ""}
                    onChange={(e) => {
                      const r = rateList.find((row) => (row.code ?? "") === e.target.value);
                      if (r) updateIva(tax.code, { rate: r.percentage, rate_code: r.code });
                    }}
                  >
                    <option value="">{t("products.taxRate")}</option>
                    {rateList.map((r) => (
                      <option key={r.code ?? r.id} value={r.code ?? ""}>
                        {r.percentage}% — {r.description}
                      </option>
                    ))}
                  </Select>
                )}

                {!isIvarbu && ivaAmount > 0 && (
                  <span className="text-xs font-semibold text-primary min-w-[70px] text-right">
                    +{fmt(ivaAmount)}
                  </span>
                )}

                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => removeIva(tax.code)}
                >
                  <Icon name="xCircle" size={14} />
                </button>
              </div>

              {isIvarbu && (
                <div>
                  <FormLabel>{t(labels.factor)}</FormLabel>
                  <Select
                    className="pp-input text-[13px]"
                    value={tax.factor ?? ""}
                    onChange={(e) =>
                      updateIva(tax.code, {
                        factor: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">{t(labels.selectFactor)}</option>
                    {factorList.map((f) => (
                      <option key={f.id} value={f.factor}>
                        {f.description}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          );
        })}

        {/* Hacienda allows one IVA-family tax per line. */}
        {ivaTaxes.length === 0 && (
          <Select
            className="pp-input"
            value=""
            onChange={(e) => e.target.value && addIva(e.target.value)}
          >
            <option value="">{t(labels.add)}</option>
            {ivaTaxTypes.map((tt) => (
              <option key={tt.code ?? tt.id} value={tt.code ?? ""}>
                {tt.description}
              </option>
            ))}
          </Select>
        )}

        {showManualBase && (
          <div className="mt-1 px-3 py-2.5 bg-accent/10 rounded-lg border border-border">
            <FormLabel required={hasIvace}>{t("lineDetail.baseAmount")}</FormLabel>
            <input
              className="pp-input"
              type="number"
              value={manualBase ?? ""}
              onChange={(e) =>
                onManualBaseChange(e.target.value === "" ? undefined : Number(e.target.value))
              }
              min={hasIvace ? subtotalAfterDiscount : 0}
              step={0.01}
              placeholder={t("lineDetail.baseAmountPlaceholder")}
            />
            <div className="t-xs text-muted-foreground mt-1">
              {hasIvace ? t("fiscal.baseAmount.ivaceHint") : t("fiscal.baseAmount.factoryHint")}
            </div>
            {ivaceBaseTooLow && (
              <div className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle size={12} className="mt-[2px] flex-shrink-0" />
                <span>{t("lineDetail.ivace.baseAmountTooLow")}</span>
              </div>
            )}
          </div>
        )}

        {factoryCharges.length > 0 && (
          <div className="mt-1 px-3 py-2.5 bg-muted/25 rounded-lg border border-dashed border-border">
            <FormLabel>{t(labels.factoryCharge)}</FormLabel>
            <Select
              className="pp-input"
              value={factoryChargeCode ?? ""}
              onChange={(e) => onFactoryChargeChange(e.target.value || undefined)}
            >
              <option value="">{t(labels.noFactoryCharge)}</option>
              {factoryCharges.map((c) => (
                <option key={c.code ?? c.id} value={c.code ?? ""}>
                  {c.description}
                </option>
              ))}
            </Select>
            {selectedCharge && (
              <div className="t-xs text-muted-foreground mt-1">
                {selectedCharge.code === IvaCollectedFactory.PRE_DETERMINED
                  ? t("products.factoryTaxAssumed")
                  : t("products.factoryTaxNotAssumed")}
              </div>
            )}
            {factoryAssumedTax > 0 && (
              <div className="text-xs font-semibold text-warning mt-1">
                {t("fiscal.factoryAssumedAmount", { amount: fmt(factoryAssumedTax) })}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
