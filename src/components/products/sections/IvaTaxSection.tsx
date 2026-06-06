import { Percent } from "lucide-react";
import { Icon, FormLabel } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllTaxes, useAllTaxRates, useAllTaxFactors, useAllFactoryTaxCharges } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import type { GetAllFactoryTaxChargesParams } from "@/services/data-api/dtos";
import { CountryISO, IvaCollectedFactory, TaxTypeCode } from "@/lib/enums";
import { labelByCode } from "@/lib/catalogLabels";
import type { TaxFormEntry } from "@/types/productForm";

const ISO = CountryISO.COSTA_RICA;
const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

const fmt = (n: number) => "₡" + Math.round(n).toLocaleString("es-CR");

interface IvaTaxSectionProps {
  taxes: TaxFormEntry[];
  factoryTaxChargeId?: number;
  baseAmount?: number; // post-discount, post-special-tax amount used for IVA calculation
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onAdd: (entry: TaxFormEntry) => void;
  onRemove: (taxCode: string) => void;
  onUpdate: (taxCode: string, patch: Partial<TaxFormEntry>) => void;
  onFactoryTaxChargeChange: (chargeId: number | undefined, hasFactoryTax: boolean) => void;
}

export function IvaTaxSection({
  taxes,
  factoryTaxChargeId,
  baseAmount = 0,
  isExpanded,
  onToggle,
  disabled,
  onAdd,
  onRemove,
  onUpdate,
  onFactoryTaxChargeChange,
}: IvaTaxSectionProps) {
  const { t } = useLanguage();
  const { data: taxesData } = useAllTaxes({ iso_code: ISO });
  const { data: taxRatesData } = useAllTaxRates({ iso_code: ISO });
  const { data: taxFactorsData } = useAllTaxFactors({ iso_code: ISO });

  // document_version_id is auto-injected by the data API client via DocumentVersionProvider
  const { data: factoryChargesData } = useAllFactoryTaxCharges(
    { iso_code: ISO } as GetAllFactoryTaxChargesParams
  );

  const allTaxTypes = taxesData ?? [];
  const rateList = taxRatesData ?? [];
  const factorList = taxFactorsData ?? [];
  const factoryCharges = factoryChargesData ?? [];

  const ivaTaxTypes = allTaxTypes.filter((t: { code?: string }) =>
    IVA_CODES.includes(t.code ?? "")
  );

  const addedIvaTaxes = taxes.filter((t) => IVA_CODES.includes(t.taxCode));

  const hasIva = addedIvaTaxes.length > 0;

  const selectedCharge = factoryCharges.find(
    (c: { id: number }) => c.id === factoryTaxChargeId
  );

  return (
    <SectionWrapper
      title={t("products.iva")}
      icon={Percent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      badge={hasIva ? addedIvaTaxes.length : undefined}
    >
      <div className="flex flex-col gap-2">
        {addedIvaTaxes.map((tax) => {
          const isIvarbu = tax.taxCode === TaxTypeCode.IVARBU;
          const ivaAmount = baseAmount > 0 ? baseAmount * tax.rate / 100 : 0;
          return (
            <div
              key={tax.taxCode}
              className="px-3 py-2.5 bg-muted/30 rounded-lg border border-border"
            >
              <div className={`flex items-center gap-2 ${isIvarbu ? "mb-2" : ""}`}>
                {/* Description only, no code */}
                <div className="flex-1 text-[13px] font-semibold">
                  {labelByCode(allTaxTypes, tax.taxCode)}
                </div>

                {!isIvarbu && (
                  <select
                    className="pp-input w-[150px] !h-auto !px-2 !py-1 text-[13px]"
                    value={tax.taxRateId ?? ""}
                    onChange={(e) => {
                      const r = rateList.find((r: { id: number }) => String(r.id) === e.target.value);
                      if (r) onUpdate(tax.taxCode, { taxRateId: r.id, rate: (r as { percentage: number }).percentage });
                    }}
                  >
                    <option value="">{t("products.taxRate")}</option>
                    {rateList.map((r: { id: number; percentage: number; description: string }) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.percentage}% — {r.description}
                      </option>
                    ))}
                  </select>
                )}

                {/* ₡ amount */}
                {!isIvarbu && ivaAmount > 0 && (
                  <span className="text-xs font-semibold text-primary min-w-[70px] text-right">
                    +{fmt(ivaAmount)}
                  </span>
                )}

                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => onRemove(tax.taxCode)}
                >
                  <Icon name="xCircle" size={14} />
                </button>
              </div>

              {isIvarbu && (
                <div>
                  <FormLabel>{t("products.ivarbuFactor")}</FormLabel>
                  <select
                    className="pp-input text-[13px]"
                    value={tax.taxFactorId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const f = factorList.find((f: { id: number }) => f.id === id) as
                        | { id: number; factor: number }
                        | undefined;
                      onUpdate(tax.taxCode, {
                        taxFactorId: id,
                        taxFactor: f?.factor,
                      });
                    }}
                  >
                    <option value="">{t("products.selectFactor")}</option>
                    {factorList.map((f: { id: number; factor: number; description: string }) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}

        {/* Add IVA — description only in options, only one allowed */}
        {addedIvaTaxes.length === 0 && (
          <select
            className="pp-input"
            value=""
            onChange={(e) => {
              const tt = ivaTaxTypes.find(
                (t: { code?: string }) => (t.code ?? "") === e.target.value
              );
              if (tt) {
                const defaultRate = rateList[0];
                onAdd({
                  taxCode: (tt as { code?: string }).code ?? "",
                  rate: (defaultRate as { percentage: number })?.percentage ?? 13,
                  taxRateId: defaultRate?.id,
                });
              }
            }}
          >
            <option value="">{t("products.addIva")}</option>
            {ivaTaxTypes.map((tt: { code?: string; description: string }) => (
              <option key={tt.code ?? ""} value={tt.code ?? ""}>
                {tt.description}
              </option>
            ))}
          </select>
        )}

        {/* Factory tax charge — description only */}
        {factoryCharges.length > 0 && (
          <div className="mt-1 px-3 py-2.5 bg-muted/25 rounded-lg border border-dashed border-border">
            <FormLabel>{t("products.factoryTaxCharge")}</FormLabel>
            <select
              className="pp-input"
              value={factoryTaxChargeId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : undefined;
                const charge = factoryCharges.find((c: { id: number; code?: string }) => c.id === id);
                onFactoryTaxChargeChange(
                  id,
                  charge?.code === IvaCollectedFactory.PRE_DETERMINED,
                );
              }}
            >
              <option value="">{t("products.noFactoryCharge")}</option>
              {factoryCharges.map((c: { id: number; description: string }) => (
                <option key={c.id} value={String(c.id)}>
                  {c.description}
                </option>
              ))}
            </select>
            {selectedCharge && (
              <div className="t-xs text-muted-foreground mt-1">
                {(selectedCharge as { code?: string }).code === IvaCollectedFactory.PRE_DETERMINED
                  ? t("products.factoryTaxAssumed")
                  : t("products.factoryTaxNotAssumed")}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
