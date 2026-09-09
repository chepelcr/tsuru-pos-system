import { Receipt } from "lucide-react";
import { FormLabel, Icon, Select } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllTaxes, useAllTaxAmounts } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CountryISO,
  TaxTypeCode,
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
  // `cabys` is still accepted and still meaningful — which ISEBEC formula
  // applies is derived from it — but that decision now lives in
  // lib/specialTaxes rather than in this form, so the row no longer reads it.
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

  // ISEBEC (05) had two special branches here, both keyed on CABYS prefixes
  // "3401" and "2202" — Harmonized System headings that match no CABYS, so
  // neither ever rendered. One of them asked for an alcohol PERCENTAGE under
  // code 05, which is wrong regardless: the alcohol degree belongs to ISEBA
  // (04). The other was a duplicate of the generic amount picker below. Both
  // removed; code 05 uses the generic picker, and which formula applies (soap
  // per gram vs. beverage by volume) is decided in lib/specialTaxes from the
  // CABYS, not in the form.



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
          {taxAmounts.length > 0 && (
            <div>
              <FormLabel>Monto de impuesto</FormLabel>
              <Select
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
              </Select>
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

        <Select
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
        </Select>
      </div>
    </SectionWrapper>
  );
}
