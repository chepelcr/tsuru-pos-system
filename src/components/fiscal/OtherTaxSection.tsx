import { useEffect } from "react";
import { Receipt } from "lucide-react";
import { FormLabel, Icon, Select } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllTaxes, useAllTaxAmounts } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO, TaxTypeCode } from "@/lib/enums";
import { isIvaCode, type FiscalMode } from "@/lib/fiscalForm";
import { alcoholAmountFor, isebecAmount, isebecAmountFor, isToiletSoap } from "@/lib/specialTaxes";
import { formatMoney as fmt } from "@/lib/money";
import { getTaxConfig } from "@/types/taxTypeConfig";
import type { TaxResponse, TaxAmountResponse } from "@/services/data-api/dtos";
import type { LineTax } from "@/types/lineDetail";

const ISO = CountryISO.COSTA_RICA;

/** Codes priced from a per-unit catalog amount (DatosImpuestoEspecifico, Nota 7). */
const SPECIAL_AMOUNT_CODES: readonly string[] = [
  TaxTypeCode.IUC,
  TaxTypeCode.ISEBA,
  TaxTypeCode.ISEBEC,
  TaxTypeCode.IPT,
];

type SpecialField = "tax_amount_id" | "quantity" | "percentage" | "proportion" | "volume_consumption";

const REQUIRED_SPECIAL_FIELDS: Record<string, SpecialField[]> = {
  [TaxTypeCode.IUC]: ["tax_amount_id", "quantity"],
  [TaxTypeCode.IPT]: ["tax_amount_id", "quantity"],
  [TaxTypeCode.ISEC]: ["tax_amount_id", "quantity"],
  // Hacienda -470: Proporcion is mandatory and > 0 on code 04. It is DERIVED
  // (quantity x degree / 100) but it still has to travel.
  [TaxTypeCode.ISEBA]: ["tax_amount_id", "quantity", "percentage", "proportion"],
  // VolumenUnidadConsumo is mandatory on EVERY code-05 line, soap included
  // (-470); soap consumes one unit, so it just always holds 1.
  [TaxTypeCode.ISEBEC]: ["tax_amount_id", "quantity", "volume_consumption"],
};

export function missingSpecialFields(tax: LineTax): SpecialField[] {
  return (REQUIRED_SPECIAL_FIELDS[tax.code] ?? []).filter((field) => {
    const value = tax.special_fields?.[field];
    return value === undefined || value === null || value === 0;
  });
}

const LABELS = {
  product: { add: "products.addTax", selectAmount: "products.selectAmount" },
  line: { add: "lineDetail.addTax", selectAmount: "lineDetail.selectAmount" },
} as const;

interface OtherTaxSectionProps {
  mode: FiscalMode;
  /** The whole tax list; this section edits only the non-IVA entries. */
  taxes: LineTax[];
  onChange: (taxes: LineTax[]) => void;
  /** Amount the ad-valorem taxes apply to (a product: its price; a line: price × qty). */
  basePrice: number;
  /** Decides which code-05 formula applies (soap per gram vs. beverage by volume). */
  cabys?: string;
  /** 1 for a product — it is the template for a line, not a line. */
  detailQuantity: number;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Missing `special_fields`, surfaced so the drawer can block save. */
  onValidationChange?: (errors: string[]) => void;
}

export function OtherTaxSection({
  mode,
  taxes,
  onChange,
  basePrice,
  cabys,
  detailQuantity,
  isExpanded,
  onToggle,
  disabled,
  onValidationChange,
}: OtherTaxSectionProps) {
  const { t } = useLanguage();
  const labels = LABELS[mode];
  const { data: taxesData } = useAllTaxes({ iso_code: ISO });
  const allTaxTypes: TaxResponse[] = taxesData ?? [];
  const otherTaxTypes = allTaxTypes.filter((tt) => !isIvaCode(tt.code));

  useEffect(() => {
    if (!onValidationChange) return;
    const errors = taxes.flatMap((tax) =>
      missingSpecialFields(tax).map((field) => t(`lineDetail.specialFields.${field}.required`)),
    );
    onValidationChange(errors);
  }, [taxes, t, onValidationChange]);

  // Edited by POSITION in the full list: code 99 (Otros) may repeat on a line,
  // so the code is not a key.
  const updateAt = (index: number, patch: Partial<LineTax>) =>
    onChange(taxes.map((tx, i) => (i === index ? { ...tx, ...patch } : tx)));
  const removeAt = (index: number) => onChange(taxes.filter((_, i) => i !== index));

  const addOther = (code: string) => {
    if (!otherTaxTypes.some((tt) => tt.code === code)) return;
    // ISEC (12) has a fixed 5% rate; others start empty.
    onChange([...taxes, { code, rate: code === TaxTypeCode.ISEC ? 5 : 0, special_fields: {} }]);
  };

  // A line may carry several "99 Otros" (different charges); a product stores
  // one entry per code.
  const addable = otherTaxTypes.filter(
    (tt) =>
      (mode === "line" && tt.code === TaxTypeCode.OTHERS) ||
      !taxes.some((tx) => tx.code === tt.code),
  );

  const otherCount = taxes.filter((tx) => !isIvaCode(tx.code)).length;

  return (
    <SectionWrapper
      title={t("products.otherTaxes")}
      icon={Receipt}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      badge={otherCount > 0 ? otherCount : undefined}
    >
      <div className="flex flex-col gap-2">
        {taxes.map((tax, index) =>
          isIvaCode(tax.code) ? null : (
            <TaxCard
              key={`${tax.code}-${index}`}
              tax={tax}
              taxType={allTaxTypes.find((tt) => tt.code === tax.code)}
              cabys={cabys}
              basePrice={basePrice}
              detailQuantity={detailQuantity}
              selectAmountLabel={t(labels.selectAmount)}
              onUpdate={(patch) => updateAt(index, patch)}
              onRemove={() => removeAt(index)}
            />
          ),
        )}

        <Select
          className="pp-input"
          value=""
          onChange={(e) => e.target.value && addOther(e.target.value)}
        >
          <option value="">{t(labels.add)}</option>
          {addable.map((tt) => (
            <option key={tt.code ?? tt.id} value={tt.code ?? ""}>
              {tt.description}
            </option>
          ))}
        </Select>
      </div>
    </SectionWrapper>
  );
}

/** What the tax adds, by code — the same arithmetic the tax service runs. */
function taxAmountFor(
  tax: LineTax,
  unitAmount: number,
  basePrice: number,
  detailQuantity: number,
  cabys?: string,
): number {
  const sf = tax.special_fields;
  switch (tax.code) {
    case TaxTypeCode.ISC:
    case TaxTypeCode.OTHERS:
      return (basePrice * (tax.rate || 0)) / 100;
    case TaxTypeCode.ISEC:
      return basePrice * 0.05;
    case TaxTypeCode.IUC:
      return (sf?.quantity || 0) * unitAmount;
    case TaxTypeCode.ISEBA:
      return detailQuantity * (((sf?.quantity || 0) * (sf?.percentage || 0)) / 100) * unitAmount;
    case TaxTypeCode.ISEBEC:
      // Soap is priced per gram, beverages by volume — same tax code, and the
      // CABYS is what tells them apart. See lib/specialTaxes.
      return isebecAmount({
        cabys,
        detailQuantity,
        quantity: sf?.quantity || 0,
        volumeConsumption: sf?.volume_consumption,
        taxUnitAmount: unitAmount,
      });
    case TaxTypeCode.IPT:
      return detailQuantity * (sf?.quantity || 0) * unitAmount;
    default:
      return 0;
  }
}

function TaxCard({
  tax,
  taxType,
  cabys,
  basePrice,
  detailQuantity,
  selectAmountLabel,
  onUpdate,
  onRemove,
}: {
  tax: LineTax;
  taxType: TaxResponse | undefined;
  cabys?: string;
  basePrice: number;
  detailQuantity: number;
  selectAmountLabel: string;
  onUpdate: (patch: Partial<LineTax>) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const code = tax.code;
  const isFixed = code === TaxTypeCode.ISEC;
  const requireRate = getTaxConfig(code)?.requireRate ?? true;
  const needsSpecialFields = SPECIAL_AMOUNT_CODES.includes(code);

  // The tax-amounts endpoint filters by the data-services numeric tax id.
  const taxTypeId = taxType ? Number(taxType.id) : 0;
  const { data: taxAmountsData } = useAllTaxAmounts(
    { iso_code: ISO, tax_id: taxTypeId },
    { enabled: needsSpecialFields && !!taxTypeId },
  );
  const taxAmounts: TaxAmountResponse[] = taxAmountsData ?? [];

  const sf = tax.special_fields;
  const unitAmount =
    taxAmounts.find((ta) => ta.id === sf?.tax_amount_id)?.amount ?? sf?.tax_unit_amount ?? 0;
  const amount = taxAmountFor(tax, unitAmount, basePrice, detailQuantity, cabys);
  const missing = missingSpecialFields(tax);

  const setSpecial = (patch: NonNullable<LineTax["special_fields"]>) =>
    onUpdate({ special_fields: { ...sf, ...patch } });

  return (
    <div className="px-3 py-2.5 bg-muted/30 rounded-lg border border-border">
      <div className={`flex items-center gap-2 ${needsSpecialFields ? "mb-2" : ""}`}>
        <div className="flex-1 text-xs font-semibold">
          {taxType?.description ?? t("lineDetail.taxes")}
        </div>

        {requireRate && !isFixed && !needsSpecialFields && (
          <>
            <input
              type="number"
              className="pp-input w-[72px] !h-auto !px-2 !py-[3px] text-xs"
              placeholder="%"
              min={0}
              max={100}
              value={tax.rate || ""}
              onChange={(e) => onUpdate({ rate: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
            {amount > 0 && (
              <span className="text-xs font-semibold text-primary min-w-[64px] text-right">
                +{fmt(amount)}
              </span>
            )}
          </>
        )}

        {isFixed && (
          <>
            <span className="text-xs font-semibold text-muted-foreground px-2 py-[3px]">5%</span>
            {basePrice > 0 && (
              <span className="text-xs font-semibold text-primary min-w-[64px] text-right">
                +{fmt(amount)}
              </span>
            )}
          </>
        )}

        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onRemove}>
          <Icon name="xCircle" size={14} />
        </button>
      </div>

      {needsSpecialFields && (
        <>
          <div className="grid-auto-fit-120 gap-2">
            {taxAmounts.length > 0 && (
              <div>
                <FormLabel>{t("lineDetail.taxAmount")}</FormLabel>
                <Select
                  className="pp-input text-xs"
                  value={sf?.tax_amount_id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    // The unit amount travels with the id so the calculation
                    // can resolve it without this catalog.
                    setSpecial({
                      tax_amount_id: id,
                      tax_unit_amount: taxAmounts.find((a) => a.id === id)?.amount,
                    });
                  }}
                >
                  <option value="">{selectAmountLabel}</option>
                  {taxAmounts.map((ta) => (
                    <option key={ta.id} value={ta.id}>
                      {ta.description} — {fmt(ta.amount)}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <FormLabel>{t("products.quantityUdm")}</FormLabel>
              <input
                type="number"
                className="pp-input text-xs"
                placeholder="0"
                min={0}
                value={sf?.quantity ?? ""}
                onChange={(e) => {
                  const quantity = Number(e.target.value);
                  // Proporcion = cantidad x grado alcohólico (Nota 8) — kept in
                  // step whichever of the two is edited.
                  setSpecial(
                    code === TaxTypeCode.ISEBA
                      ? { quantity, proportion: (quantity * (sf?.percentage ?? 0)) / 100 }
                      : { quantity },
                  );
                }}
              />
            </div>

            {code === TaxTypeCode.ISEBA && (
              <div>
                <FormLabel>{t("products.percentage")}</FormLabel>
                <input
                  type="number"
                  className="pp-input text-xs"
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  value={sf?.percentage ?? ""}
                  onChange={(e) => {
                    // The alcohol degree DETERMINES the code-04 bracket ("Hasta
                    // 15%", "Más de 15% y hasta 30%", "Más de 30%"), so it is
                    // filled in rather than asked for. A degree matching no
                    // bracket leaves the existing choice alone — guessing would
                    // put a wrong excise on a legal document.
                    const percentage = Number(e.target.value);
                    const bracket = alcoholAmountFor(percentage, taxAmounts);
                    setSpecial({
                      percentage,
                      proportion: ((sf?.quantity ?? 0) * percentage) / 100,
                      ...(bracket
                        ? { tax_amount_id: Number(bracket.id), tax_unit_amount: bracket.amount ?? undefined }
                        : {}),
                    });
                  }}
                />
              </div>
            )}

            {code === TaxTypeCode.ISEBEC && (
              <div>
                <FormLabel>{t("products.volumePerUnit")}</FormLabel>
                <input
                  type="number"
                  className="pp-input text-xs"
                  placeholder="0"
                  min={0}
                  value={sf?.volume_consumption ?? ""}
                  onChange={(e) => {
                    // Code 05 covers packaged beverages AND toilet soap, priced
                    // on different units; the CABYS tells them apart, so the
                    // per-unit amount follows from it rather than being picked.
                    const match = isebecAmountFor(cabys, taxAmounts);
                    setSpecial({
                      volume_consumption: Number(e.target.value),
                      ...(match
                        ? { tax_amount_id: Number(match.id), tax_unit_amount: match.amount ?? undefined }
                        : {}),
                    });
                  }}
                />
                {isToiletSoap(cabys) && (
                  <div className="t-xs text-muted-foreground mt-1 italic">
                    {t("products.soapVolumeHint")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`mt-2 px-2.5 py-1.5 rounded-md flex justify-between items-center ${
              amount > 0 ? "bg-primary/[0.08]" : "bg-muted/30"
            }`}
          >
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("lineDetail.taxAmount")}
            </span>
            <span
              className={`text-[13px] font-bold font-mono ${
                amount > 0 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {amount > 0 ? `+${fmt(amount)}` : fmt(0)}
            </span>
          </div>

          {missing.length > 0 && (
            <div className="mt-1 flex flex-col gap-0.5">
              {missing.map((field) => (
                <div key={field} className="text-[11px] text-destructive">
                  {t(`lineDetail.specialFields.${field}.required`)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
