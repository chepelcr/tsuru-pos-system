import { Receipt } from "lucide-react";
import { Icon, FormLabel } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllTaxes, useAllTaxAmounts } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CabysSpecialPrefix,
  CountryISO,
  TaxTypeCode,
  cabysStartsWith,
} from "@/lib/enums";
import { labelByCode } from "@/lib/catalogLabels";
import { getTaxConfig } from "@/types/taxTypeConfig";
import type { TaxFormEntry } from "@/types/productForm";
import type { TaxAmountResponse, TaxResponse } from "@/services/data-api/dtos";

const ISO = CountryISO.COSTA_RICA;
const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];
const fmt = (n: number) => "₡" + Math.round(n).toLocaleString("es-CR");
const SPECIAL_AMOUNT_CODES: readonly string[] = [
  TaxTypeCode.IUC,
  TaxTypeCode.ISEBA,
  TaxTypeCode.ISEBEC,
  TaxTypeCode.IPT,
];

interface OtherTaxSectionProps {
  taxes: TaxFormEntry[];
  cabys?: string;
  basePrice?: number;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onAdd: (entry: TaxFormEntry) => void;
  onRemove: (taxCode: string) => void;
  onUpdate: (taxCode: string, patch: Partial<TaxFormEntry>) => void;
}

function SpecialTaxRow({
  tax,
  cabys,
  basePrice = 0,
  onUpdate,
  onRemove,
}: {
  tax: TaxFormEntry;
  cabys?: string;
  basePrice?: number;
  onUpdate: (taxCode: string, patch: Partial<TaxFormEntry>) => void;
  onRemove: (taxCode: string) => void;
}) {
  const { t } = useLanguage();
  const cfg = getTaxConfig(tax.taxCode);
  const needsAmounts = SPECIAL_AMOUNT_CODES.includes(tax.taxCode);

  // The data-api tax-amounts endpoint filters by the data-services numeric
  // tax_id; resolve it from the Hacienda code via the tax-types catalog.
  const { data: allTaxesData } = useAllTaxes({ iso_code: ISO });
  const allTaxesRows = (allTaxesData ?? []) as TaxResponse[];
  const taxTypeRow = allTaxesRows.find((tt) => tt.code === tax.taxCode) as
    | { id?: number }
    | undefined;
  const taxLabel = labelByCode(allTaxesRows, tax.taxCode);

  const { data: taxAmountsData } = useAllTaxAmounts(
    { iso_code: ISO, tax_id: taxTypeRow?.id ?? 0 },
    { enabled: needsAmounts && !!taxTypeRow?.id }
  );
  const taxAmounts: TaxAmountResponse[] = taxAmountsData ?? [];

  const isIsebec = tax.taxCode === TaxTypeCode.ISEBEC;
  const isAlcoholic = cabysStartsWith(cabys, CabysSpecialPrefix.ISEBEC_ALCOHOLIC);
  const isNonAlcoholic = cabysStartsWith(cabys, CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC);
  const isBeverage = isAlcoholic || isNonAlcoholic;

  const handlePercentageChange = (pct: number) => {
    const match = taxAmounts.find(
      (ta) =>
        ta.min_percentage !== null &&
        ta.max_percentage !== null &&
        pct >= ta.min_percentage &&
        pct <= ta.max_percentage
    );
    onUpdate(tax.taxCode, {
      specialFields: {
        ...tax.specialFields,
        percentage: pct,
        taxAmountId: match?.id ?? tax.specialFields?.taxAmountId,
        taxAmount: match?.amount ?? tax.specialFields?.taxAmount,
      },
    });
  };

  const selectedAmount = taxAmounts.find((ta) => ta.id === tax.specialFields?.taxAmountId);

  return (
    <div className="px-3 py-2.5 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 text-xs font-semibold">{taxLabel}</div>

        {(cfg?.requireRate ?? true) && tax.taxCode !== TaxTypeCode.ISEC && !needsAmounts && (
          <>
            <input
              type="number"
              className="pp-input w-[72px] !h-auto !px-2 !py-[3px] text-xs"
              placeholder="0"
              min={0}
              max={100}
              value={tax.rate || ""}
              onChange={(e) =>
                onUpdate(tax.taxCode, {
                  rate: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
            />
            {basePrice > 0 && tax.rate > 0 && (
              <span className="text-xs font-semibold text-primary min-w-[64px] text-right">
                +{fmt(basePrice * tax.rate / 100)}
              </span>
            )}
          </>
        )}
        {tax.taxCode === TaxTypeCode.ISEC && (
          <>
            <span className="text-xs font-semibold text-muted-foreground px-2 py-[3px]">
              5%
            </span>
            {basePrice > 0 && (
              <span className="text-xs font-semibold text-primary min-w-[64px] text-right">
                +{fmt(basePrice * 0.05)}
              </span>
            )}
          </>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onRemove(tax.taxCode)}
        >
          <Icon name="xCircle" size={14} />
        </button>
      </div>

      {needsAmounts && (
        <div className="flex flex-col gap-2">
          {isIsebec && isBeverage && (
            <>
              {isAlcoholic && (
                <div>
                  <FormLabel>{t("products.alcoholPercentage")}</FormLabel>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="number"
                      className="pp-input flex-1 text-xs"
                      placeholder={t("products.alcoholPercentageExample")}
                      min={0}
                      max={100}
                      step={0.1}
                      value={tax.specialFields?.percentage ?? ""}
                      onChange={(e) => handlePercentageChange(Number(e.target.value))}
                    />
                    <span className="t-xs text-muted-foreground">%</span>
                  </div>
                  {selectedAmount && (
                    <div className="t-xs text-primary mt-1">
                      {t("products.amountPerUnit", { amount: selectedAmount.amount.toLocaleString("es-CR"), desc: selectedAmount.description })}
                    </div>
                  )}
                  {tax.specialFields?.percentage && !selectedAmount && taxAmounts.length > 0 && (
                    <div className="t-xs text-destructive mt-1">
                      {t("products.noAmountForPercentage")}
                    </div>
                  )}
                </div>
              )}

              {isNonAlcoholic && taxAmounts.length > 0 && (
                <div>
                  <FormLabel>{t("products.taxAmountLabel")}</FormLabel>
                  <select
                    className="pp-input text-xs"
                    value={tax.specialFields?.taxAmountId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const ta = taxAmounts.find((a) => a.id === id);
                      onUpdate(tax.taxCode, {
                        specialFields: {
                          ...tax.specialFields,
                          taxAmountId: id,
                          taxAmount: ta?.amount,
                        },
                      });
                    }}
                  >
                    <option value="">{t("products.selectAmount")}</option>
                    {taxAmounts.map((ta) => (
                      <option key={ta.id} value={String(ta.id)}>
                        {ta.description} — ₡{ta.amount.toLocaleString("es-CR")}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {(!isIsebec || !isBeverage) && taxAmounts.length > 0 && (
            <div>
              <FormLabel>Monto de impuesto</FormLabel>
              <select
                className="pp-input text-xs"
                value={tax.specialFields?.taxAmountId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const ta = taxAmounts.find((a) => a.id === id);
                  onUpdate(tax.taxCode, {
                    specialFields: {
                      ...tax.specialFields,
                      taxAmountId: id,
                      taxAmount: ta?.amount,
                    },
                  });
                }}
              >
                <option value="">{t("products.selectAmount")}</option>
                {taxAmounts.map((ta) => (
                  <option key={ta.id} value={String(ta.id)}>
                    {ta.description} — ₡{ta.amount.toLocaleString("es-CR")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {SPECIAL_AMOUNT_CODES.includes(tax.taxCode) && (
            <div>
              <FormLabel>{t("products.quantityUdm")}</FormLabel>
              <input
                type="number"
                className="pp-input text-xs"
                placeholder="0"
                min={0}
                value={tax.specialFields?.quantity ?? ""}
                onChange={(e) =>
                  onUpdate(tax.taxCode, {
                    specialFields: { ...tax.specialFields, quantity: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}

          {tax.taxCode === TaxTypeCode.ISEBA && (
            <div>
              <FormLabel>{t("products.percentage")}</FormLabel>
              <input
                type="number"
                className="pp-input text-xs"
                placeholder="0"
                min={0}
                max={100}
                value={tax.specialFields?.percentage ?? ""}
                onChange={(e) =>
                  onUpdate(tax.taxCode, {
                    specialFields: { ...tax.specialFields, percentage: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}

          {tax.taxCode === TaxTypeCode.ISEBEC && (
            <div>
              <FormLabel>{t("products.volumePerUnit")}</FormLabel>
              <input
                type="number"
                className="pp-input text-xs"
                placeholder="0"
                min={0}
                value={tax.specialFields?.volumeConsumption ?? ""}
                onChange={(e) =>
                  onUpdate(tax.taxCode, {
                    specialFields: { ...tax.specialFields, volumeConsumption: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OtherTaxSection({
  taxes,
  cabys,
  basePrice = 0,
  isExpanded,
  onToggle,
  disabled,
  onAdd,
  onRemove,
  onUpdate,
}: OtherTaxSectionProps) {
  const { t } = useLanguage();
  const { data: taxesData } = useAllTaxes({ iso_code: ISO });
  const allTaxTypes = taxesData ?? [];

  const otherTaxTypes = allTaxTypes.filter(
    (t: { code?: string }) => !IVA_CODES.includes(t.code ?? "")
  );
  const addedOtherTaxes = taxes.filter((t) => !IVA_CODES.includes(t.taxCode));

  return (
    <SectionWrapper
      title={t("products.otherTaxes")}
      icon={Receipt}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      badge={addedOtherTaxes.length > 0 ? addedOtherTaxes.length : undefined}
    >
      <div className="flex flex-col gap-2">
        {addedOtherTaxes.map((tax) => (
          <SpecialTaxRow
            key={tax.taxCode}
            tax={tax}
            cabys={cabys}
            basePrice={basePrice}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}

        <select
          className="pp-input"
          value=""
          onChange={(e) => {
            const tt = otherTaxTypes.find(
              (t: { code?: string }) => (t.code ?? "") === e.target.value
            );
            if (tt) {
              const code = (tt as { code?: string }).code ?? "";
              onAdd({
                taxCode: code,
                // ISEC (12) has a fixed 5% rate; others start empty so the
                // input shows the "0" placeholder until the user types.
                rate: code === TaxTypeCode.ISEC ? 5 : 0,
              });
            }
          }}
        >
          <option value="">{t("products.addTax")}</option>
          {otherTaxTypes
            .filter(
              (tt: { code?: string }) =>
                !taxes.some((ft) => ft.taxCode === (tt.code ?? ""))
            )
            .map((tt: { code?: string; description: string }) => (
              <option key={tt.code ?? ""} value={tt.code ?? ""}>
                {tt.description}
              </option>
            ))}
        </select>
      </div>
    </SectionWrapper>
  );
}
