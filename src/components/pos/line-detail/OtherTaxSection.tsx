import { useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { FormLabel, Icon, Select } from "@/components/ui";
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { useAllTaxes, useAllTaxAmounts } from '@/hooks/useDataApi';
import {
  CountryISO,
  TaxTypeCode,
} from '@/lib/enums';
import { alcoholAmountFor, isebecAmount } from '@/lib/specialTaxes';
import { getTaxConfig } from '@/types/taxTypeConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LineTax } from '@/types/lineDetail';
import type { TaxResponse, TaxAmountResponse } from '@/services/data-api/dtos';

/**
 * Per-code `special_fields` requirements (Hacienda Nota 7 — DatosImpuestoEspecifico).
 * For ISEBEC the alcoholic-vs-non-alcoholic split is decided by the CABYS
 * prefix (see `validateSpecialFields` below).
 */
type SpecialField =
  | 'tax_amount_id'
  | 'quantity'
  | 'percentage'
  | 'proportion'
  | 'volume_consumption';

const BASE_SPECIAL_FIELDS_BY_CODE: Record<string, SpecialField[]> = {
  [TaxTypeCode.IUC]:    ['tax_amount_id', 'quantity'],
  [TaxTypeCode.IPT]:    ['tax_amount_id', 'quantity'],
  [TaxTypeCode.ISEC]:   ['tax_amount_id', 'quantity'],
  // Hacienda -470: "el campo Proporcion es de condición obligatoria y debe
  // ser mayor a cero, cuando se utilice el codigo de impuesto 04". The
  // proportion of absolute alcohol is DERIVED (quantity x degree / 100) but it
  // still has to travel — it was computed for the amount and then dropped.
  [TaxTypeCode.ISEBA]:  ['tax_amount_id', 'quantity', 'percentage', 'proportion'],
};

function requiredSpecialFields(tax: LineTax, _cabys?: string): SpecialField[] {
  const code = tax.code;
  if (!code) return [];
  if (code === TaxTypeCode.ISEBEC) {
    // VolumenUnidadConsumo is mandatory on EVERY code-05 line, soap included
    // (-470). Soap consumes one unit, so the field is still required — it just
    // always holds 1.
    return ['tax_amount_id', 'quantity', 'volume_consumption'];
  }
  return BASE_SPECIAL_FIELDS_BY_CODE[code] ?? [];
}

function missingSpecialFields(tax: LineTax, cabys?: string): SpecialField[] {
  const required = requiredSpecialFields(tax, cabys);
  return required.filter((field) => {
    const value = tax.special_fields?.[field];
    return value === undefined || value === null || value === 0;
  });
}

const ISO = CountryISO.COSTA_RICA;
const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];
const SPECIAL_AMOUNT_CODES: readonly string[] = [
  TaxTypeCode.IUC,
  TaxTypeCode.ISEBA,
  TaxTypeCode.ISEBEC,
  TaxTypeCode.IPT,
];
const fmt = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR');

interface OtherTaxSectionProps {
  taxes: LineTax[];
  onChange: (taxes: LineTax[]) => void;
  basePrice: number;
  cabys?: string;
  detailQuantity: number;
  isExpanded: boolean;
  onToggle: () => void;
  /**
   * Surfaces aggregated `special_fields` validation errors to the parent so
   * the drawer can render them inline and block save.
   */
  onValidationChange?: (errors: string[]) => void;
}

export function OtherTaxSection({
  taxes,
  onChange,
  basePrice,
  cabys,
  detailQuantity,
  isExpanded,
  onToggle,
  onValidationChange,
}: OtherTaxSectionProps) {
  const { t } = useLanguage();

  // Aggregate per-tax `special_fields` validation errors so the drawer can
  // block save and render them inline. Re-derive on every taxes/cabys change.
  useEffect(() => {
    if (!onValidationChange) return;
    const errors: string[] = [];
    taxes.forEach((tax) => {
      const missing = missingSpecialFields(tax, cabys);
      missing.forEach((field) => {
        errors.push(t(`lineDetail.specialFields.${field}.required`));
      });
    });
    onValidationChange(errors);
  }, [taxes, cabys, t, onValidationChange]);
  const { data: taxesData } = useAllTaxes({ iso_code: ISO });
  const allTaxTypes: TaxResponse[] = taxesData ?? [];

  /**
   * Calculate tax amount based on Hacienda code + special fields.
   * `taxAmounts` are catalog lookups keyed by the data-api numeric id, which
   * persists inside `tax.special_fields.tax_amount_id` (Hacienda canonical).
   */
  const calculateTaxAmount = (tax: LineTax, taxAmounts: TaxAmountResponse[]): number => {
    const code = tax.code;
    if (!code) return 0;

    if (code === TaxTypeCode.ISC || code === TaxTypeCode.OTHERS) {
      return (basePrice * (tax.rate || 0)) / 100;
    }
    if (code === TaxTypeCode.ISEC) return basePrice * 0.05;

    const taxAmountId = tax.special_fields?.tax_amount_id;
    const taxAmountItem = taxAmounts.find((ta) => ta.id === taxAmountId);
    const taxAmountValue = taxAmountItem?.amount || 0;

    if (code === TaxTypeCode.IUC) {
      return (tax.special_fields?.quantity || 0) * taxAmountValue;
    }
    if (code === TaxTypeCode.ISEBA) {
      const quantity = tax.special_fields?.quantity || 0;
      const percentage = tax.special_fields?.percentage || 0;
      const proportion = (quantity * percentage) / 100;
      return detailQuantity * proportion * taxAmountValue;
    }
    if (code === TaxTypeCode.ISEBEC) {
      // Soap is priced per gram, beverages by volume — same tax code, and the
      // CABYS is what tells them apart. See lib/specialTaxes.
      return isebecAmount({
        cabys,
        detailQuantity,
        quantity: tax.special_fields?.quantity || 0,
        volumeConsumption: tax.special_fields?.volume_consumption,
        taxUnitAmount: taxAmountValue,
      });
    }
    if (code === TaxTypeCode.IPT) {
      return detailQuantity * (tax.special_fields?.quantity || 0) * taxAmountValue;
    }
    return 0;
  };

  const otherTaxTypes = allTaxTypes.filter(
    (t) => !IVA_CODES.includes(t.code ?? ''),
  );

  const addedOtherTaxes = taxes.filter((t) => !IVA_CODES.includes(t.code ?? ''));

  const addOther = (taxCode: string) => {
    const tt = otherTaxTypes.find((t) => t.code === taxCode);
    if (!tt) return;
    onChange([
      ...taxes,
      {
        code: taxCode,
        rate: taxCode === TaxTypeCode.ISEC ? 5 : 0,
        special_fields: {},
      },
    ]);
  };

  const removeOther = (taxCode: string) => {
    onChange(taxes.filter((t) => t.code !== taxCode));
  };

  const updateOther = (taxCode: string, patch: Partial<LineTax>) => {
    onChange(taxes.map((t) => (t.code === taxCode ? { ...t, ...patch } : t)));
  };

  return (
    <SectionWrapper
      title={t('products.otherTaxes')}
      icon={Receipt}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={addedOtherTaxes.length > 0 ? addedOtherTaxes.length : undefined}
    >
      <div className="flex flex-col gap-2">
        {addedOtherTaxes.map((tax) => {
          const tt = allTaxTypes.find((x) => x.code === tax.code);
          const cfg = getTaxConfig(tax.code);
          const isFixed = tax.code === TaxTypeCode.ISEC;
          const requireRate = cfg?.requireRate ?? true;
          const needsSpecialFields = SPECIAL_AMOUNT_CODES.includes(tax.code ?? '');

          const missing = missingSpecialFields(tax, cabys);
          return (
            <TaxCard
              key={tax.code}
              tax={tax}
              taxType={tt}
              // Pass the data-api numeric id so TaxCard can fetch the
              // tax-amounts catalog (tax_id query param on the data-api).
              taxTypeId={tt ? Number(tt.id) : undefined}
              code={tax.code ?? ''}
              isFixed={isFixed}
              requireRate={requireRate}
              needsSpecialFields={needsSpecialFields}
              basePrice={basePrice}
              calculateTaxAmount={calculateTaxAmount}
              missingFields={missing}
              onUpdate={(patch) => updateOther(tax.code!, patch)}
              onRemove={() => removeOther(tax.code!)}
            />
          );
        })}

        {/* Add other tax */}
        <Select
          className="pp-input"
          value=""
          onChange={(e) => {
            if (e.target.value) addOther(e.target.value);
          }}
        >
          <option value="">{t('lineDetail.addTax')}</option>
          {otherTaxTypes
            .filter((tt) => {
              if (tt.code === TaxTypeCode.OTHERS) return true;
              return !taxes.some((t) => t.code === tt.code);
            })
            .map((tt) => (
              <option key={tt.code ?? tt.id} value={tt.code}>
                {tt.description}
              </option>
            ))}
        </Select>
      </div>
    </SectionWrapper>
  );
}

function TaxCard({
  tax,
  taxType,
  taxTypeId,
  code,
  isFixed,
  requireRate,
  needsSpecialFields,
  basePrice,
  calculateTaxAmount,
  missingFields,
  onUpdate,
  onRemove,
}: {
  tax: LineTax;
  taxType: TaxResponse | undefined;
  /** Data-api numeric id (only used to fetch the tax-amounts catalog). */
  taxTypeId?: number;
  code: string;
  isFixed: boolean;
  requireRate: boolean;
  needsSpecialFields: boolean;
  basePrice: number;
  calculateTaxAmount: (tax: LineTax, taxAmounts: TaxAmountResponse[]) => number;
  missingFields: SpecialField[];
  onUpdate: (patch: Partial<LineTax>) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const { data: taxAmountsData } = useAllTaxAmounts(
    { iso_code: ISO, tax_id: taxTypeId ?? 0 },
    { enabled: needsSpecialFields && !!taxTypeId },
  );
  const taxAmounts: TaxAmountResponse[] = taxAmountsData ?? [];
  const taxAmount = calculateTaxAmount(tax, taxAmounts);

  return (
    <div className="px-3 py-2.5 bg-muted/30 rounded-lg border border-border">
      <div className={`flex items-center gap-2 ${needsSpecialFields ? 'mb-2' : ''}`}>
        <div className="flex-1 text-xs font-semibold">
          {taxType?.description ?? t('lineDetail.taxes')}
        </div>

        {requireRate && !isFixed && !needsSpecialFields && (
          <>
            <input
              type="number"
              className="pp-input w-[72px] !h-auto !px-2 !py-[3px] text-xs"
              placeholder="%"
              min={0}
              max={100}
              value={tax.rate ?? ''}
              onChange={(e) => onUpdate({ rate: Number(e.target.value) })}
            />
            {taxAmount > 0 && (
              <span className="text-xs font-semibold text-primary min-w-[64px] text-right">
                +{fmt(taxAmount)}
              </span>
            )}
          </>
        )}

        {isFixed && (
          <>
            <span className="text-xs font-semibold text-muted-foreground px-2 py-[3px]">5%</span>
            {basePrice > 0 && (
              <span className="text-xs font-semibold text-primary min-w-[64px] text-right">
                +{fmt(basePrice * 0.05)}
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
                <FormLabel>{t('lineDetail.taxAmount')}</FormLabel>
                <Select
                  className="pp-input text-xs"
                  value={tax.special_fields?.tax_amount_id ?? ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const ta = taxAmounts.find((a) => a.id === selectedId);
                    onUpdate({
                      special_fields: {
                        ...tax.special_fields,
                        tax_amount_id: selectedId,
                        // Capture the unit amount inline so the line-detail
                        // calc can resolve it without re-running this hook.
                        tax_unit_amount: ta?.amount,
                      },
                    });
                  }}
                >
                  <option value="">{t('lineDetail.selectAmount')}</option>
                  {taxAmounts.map((ta) => (
                    <option key={ta.id} value={ta.id}>
                      {ta.description} — ₡{ta.amount.toLocaleString('es-CR')}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {SPECIAL_AMOUNT_CODES.includes(code) && (
              <div>
                <FormLabel>{t('products.quantityUdm')}</FormLabel>
                <input
                  type="number"
                  className="pp-input text-xs"
                  placeholder="0"
                  min={0}
                  value={tax.special_fields?.quantity ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      special_fields: { ...tax.special_fields, quantity: Number(e.target.value) },
                    })
                  }
                />
              </div>
            )}

            {code === TaxTypeCode.ISEBA && (
              <div>
                <FormLabel>{t('products.percentage')}</FormLabel>
                <input
                  type="number"
                  className="pp-input text-xs"
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  value={tax.special_fields?.percentage ?? ''}
                  onChange={(e) => {
                    // The alcohol degree DETERMINES the code-04 bracket
                    // ("Hasta 15%", "Más de 15% y hasta 30%", "Más de 30%"),
                    // so it is filled in rather than asked for. A degree that
                    // matches no bracket leaves the existing choice alone —
                    // guessing would put a wrong excise on a legal document.
                    const percentage = Number(e.target.value);
                    const bracket = alcoholAmountFor(percentage, taxAmounts);
                    // Proporcion = cantidad x grado alcohólico (Nota 8).
                    const quantity = tax.special_fields?.quantity ?? 0;
                    onUpdate({
                      special_fields: {
                        ...tax.special_fields,
                        percentage,
                        proportion: (quantity * percentage) / 100,
                        ...(bracket
                          ? { tax_amount_id: Number(bracket.id), tax_unit_amount: bracket.amount ?? undefined }
                          : {}),
                      },
                    });
                  }}
                />
              </div>
            )}

            {code === TaxTypeCode.ISEBEC && (
              <div>
                <FormLabel>{t('products.volumePerUnit')}</FormLabel>
                <input
                  type="number"
                  className="pp-input text-xs"
                  placeholder="0"
                  min={0}
                  value={tax.special_fields?.volume_consumption ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      special_fields: {
                        ...tax.special_fields,
                        volume_consumption: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div
            className={`mt-2 px-2.5 py-1.5 rounded-md flex justify-between items-center ${
              taxAmount > 0 ? 'bg-primary/[0.08]' : 'bg-muted/30'
            }`}
          >
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t('lineDetail.taxAmount')}
            </span>
            <span
              className={`text-[13px] font-bold font-mono ${
                taxAmount > 0 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {taxAmount > 0 ? `+${fmt(taxAmount)}` : '₡0'}
            </span>
          </div>

          {missingFields.length > 0 && (
            <div className="mt-1 flex flex-col gap-0.5">
              {missingFields.map((field) => (
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
