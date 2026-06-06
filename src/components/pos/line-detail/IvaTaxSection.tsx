import { useEffect } from 'react';
import { Percent, AlertTriangle } from 'lucide-react';
import { Icon, FormLabel } from '@/components/ui';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import {
  useAllTaxes,
  useAllTaxRates,
  useAllTaxFactors,
  useAllFactoryTaxCharges,
} from '@/hooks/useDataApi';
import {
  CountryISO,
  IvaCollectedFactory,
  TaxRateCode,
  TaxTypeCode,
} from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LineTax } from '@/types/lineDetail';

const VALID_TAX_RATE_CODES: readonly string[] = Object.values(TaxRateCode);
import type {
  GetAllFactoryTaxChargesParams,
  TaxResponse,
  TaxRateResponse,
  TaxFactorResponse,
  FactoryTaxChargeResponse,
} from '@/services/data-api/dtos';

const ISO = CountryISO.COSTA_RICA;
const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];
const fmt = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR');

interface IvaTaxSectionProps {
  taxes: LineTax[];
  onChange: (taxes: LineTax[]) => void;
  /** Hacienda factory-tax-charge code (string) instead of numeric id. */
  factoryTaxChargeCode?: string;
  onFactoryTaxChargeChange: (chargeCode: string | undefined) => void;
  baseAmount: number;
  /** Net subtotal after the discount cascade — required for IVACE-07 base-amount validation. */
  subtotalAfterDiscount: number;
  factoryAssumedTax: number;
  isExpanded: boolean;
  onToggle: () => void;
  detail: { base_amount?: number };
  onDetailChange: (patch: { base_amount?: number }) => void;
  /** Bubbles FE-side rate-code validation up so the drawer can block save. */
  onValidationChange?: (errors: string[]) => void;
}

export function IvaTaxSection({
  taxes,
  onChange,
  factoryTaxChargeCode,
  onFactoryTaxChargeChange,
  baseAmount,
  subtotalAfterDiscount,
  factoryAssumedTax,
  isExpanded,
  onToggle,
  detail,
  onDetailChange,
  onValidationChange,
}: IvaTaxSectionProps) {
  const { t } = useLanguage();
  const { data: taxesData } = useAllTaxes({ iso_code: ISO });
  const { data: taxRatesData } = useAllTaxRates({ iso_code: ISO });
  const { data: taxFactorsData } = useAllTaxFactors({ iso_code: ISO });
  const { data: factoryChargesData } = useAllFactoryTaxCharges(
    { iso_code: ISO } as GetAllFactoryTaxChargesParams,
  );

  const allTaxTypes: TaxResponse[] = taxesData ?? [];
  const rateList: TaxRateResponse[] = taxRatesData ?? [];
  const factorList: TaxFactorResponse[] = taxFactorsData ?? [];
  const factoryCharges: FactoryTaxChargeResponse[] = factoryChargesData ?? [];

  const ivaTaxTypes = allTaxTypes.filter((t) => IVA_CODES.includes(t.code ?? ''));

  // Canonical: tax.code is the Hacienda tax type code string ("01" IVA, ...).
  const addedIvaTaxes = taxes.filter((t) => IVA_CODES.includes(t.code ?? ''));

  const hasIva = addedIvaTaxes.length > 0;
  const hasIvace = addedIvaTaxes.some((t) => t.code === TaxTypeCode.IVACE);
  const showBaseAmount = hasIvace || !!factoryTaxChargeCode;

  // IVACE Nota 7: the user-entered base must cover at least the discounted
  // subtotal — otherwise the BE will reject the document. Showing this
  // inline keeps the bad state visible while editing.
  const ivaceBaseTooLow =
    hasIvace && (detail.base_amount ?? 0) < subtotalAfterDiscount;

  const addIva = (taxCode: string) => {
    const tt = ivaTaxTypes.find((t) => t.code === taxCode);
    if (!tt) return;
    const defaultRate = rateList[0];
    onChange([
      ...taxes,
      {
        code: taxCode,
        rate: defaultRate?.percentage ?? 13,
        rate_code: defaultRate?.code,
        special_fields: {},
      },
    ]);
  };

  const removeIva = (taxCode: string) => {
    onChange(taxes.filter((t) => t.code !== taxCode));
  };

  const updateIva = (taxCode: string, patch: Partial<LineTax>) => {
    onChange(taxes.map((t) => (t.code === taxCode ? { ...t, ...patch } : t)));
  };

  const selectedCharge = factoryCharges.find(
    (c) => c.code === factoryTaxChargeCode,
  );

  // FE mirror of the BE Pydantic `TaxRateCode` validator — surfaces an inline
  // error if the data-services catalog returned a code not in the Hacienda
  // enum, so the user catches it before save.
  useEffect(() => {
    if (!onValidationChange) return;
    const errs: string[] = [];
    addedIvaTaxes.forEach((tax) => {
      const code = tax.rate_code;
      if (code !== undefined && code !== '' && !VALID_TAX_RATE_CODES.includes(code)) {
        errs.push(t('lineDetail.iva.rateCodeInvalid', { code }));
      }
    });
    onValidationChange(errs);
  }, [addedIvaTaxes, onValidationChange, t]);

  return (
    <SectionWrapper
      title={t('lineDetail.taxesIvaTitle')}
      icon={Percent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={hasIva ? addedIvaTaxes.length : undefined}
    >
      <div className="flex flex-col gap-2">
        {addedIvaTaxes.map((tax) => {
          const tt = allTaxTypes.find((x) => x.code === tax.code);
          const isIvarbu = tax.code === TaxTypeCode.IVARBU;
          const ivaAmount = baseAmount > 0 && tax.rate ? (baseAmount * tax.rate) / 100 : 0;

          return (
            <div
              key={tax.code}
              className="px-3 py-2.5 bg-muted/30 rounded-lg border border-border"
            >
              <div className={`flex items-center gap-2 ${isIvarbu ? 'mb-2' : ''}`}>
                <div className="flex-1 text-[13px] font-semibold">
                  {tt?.description ?? t('lineDetail.taxesIvaTitle')}
                </div>

                {!isIvarbu && (
                  <select
                    className="pp-input w-20 !h-auto !px-2 !py-1 text-[13px]"
                    value={tax.rate_code ?? ''}
                    onChange={(e) => {
                      const r = rateList.find((r) => r.code === e.target.value);
                      if (r) updateIva(tax.code!, { rate_code: r.code, rate: r.percentage });
                    }}
                  >
                    <option value="">%</option>
                    {rateList.map((r) => (
                      <option key={r.code ?? r.id} value={r.code}>
                        {r.percentage}%
                      </option>
                    ))}
                  </select>
                )}

                {!isIvarbu && ivaAmount > 0 && (
                  <span className="text-xs font-semibold text-primary min-w-[70px] text-right">
                    +{fmt(ivaAmount)}
                  </span>
                )}

                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => removeIva(tax.code!)}
                >
                  <Icon name="xCircle" size={14} />
                </button>
              </div>

              {isIvarbu && (
                <div>
                  <FormLabel>{t('lineDetail.ivarbu')}</FormLabel>
                  <select
                    className="pp-input text-[13px]"
                    value={tax.factor ?? ''}
                    onChange={(e) =>
                      updateIva(tax.code!, {
                        factor: parseFloat(e.target.value) || undefined,
                      })
                    }
                  >
                    <option value="">{t('lineDetail.selectFactor')}</option>
                    {factorList.map((f) => (
                      <option key={f.id} value={f.factor}>
                        {f.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}

        {addedIvaTaxes.length === 0 && (
          <select
            className="pp-input"
            value=""
            onChange={(e) => {
              if (e.target.value) addIva(e.target.value);
            }}
          >
            <option value="">{t('lineDetail.addIva')}</option>
            {ivaTaxTypes.map((tt) => (
              <option key={tt.code ?? tt.id} value={tt.code}>
                {tt.description}
              </option>
            ))}
          </select>
        )}

        {showBaseAmount && (
          <div className="mt-1 px-3 py-2.5 bg-accent/10 rounded-lg border border-border">
            <FormLabel required={hasIvace}>{t('lineDetail.baseAmount')}</FormLabel>
            <input
              className="pp-input"
              type="number"
              value={detail.base_amount ?? ''}
              onChange={(e) =>
                onDetailChange({ base_amount: parseFloat(e.target.value) || undefined })
              }
              min={hasIvace ? subtotalAfterDiscount : 0}
              step={0.01}
              placeholder={t('lineDetail.baseAmountPlaceholder')}
            />
            <div className="t-xs text-muted-foreground mt-1">
              {hasIvace
                ? 'IVACE requiere un monto base manual para el cálculo del impuesto'
                : 'El monto base se usa para calcular el IVA cuando hay cargo de fábrica'}
            </div>
            {ivaceBaseTooLow && (
              <div className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle size={12} className="mt-[2px] flex-shrink-0" />
                <span>{t('lineDetail.ivace.baseAmountTooLow')}</span>
              </div>
            )}
          </div>
        )}

        {factoryCharges.length > 0 && (
          <div className="mt-1 px-3 py-2.5 bg-muted/25 rounded-lg border border-dashed border-border">
            <FormLabel>{t('lineDetail.factoryCharge')}</FormLabel>
            <select
              className="pp-input"
              value={factoryTaxChargeCode ?? ''}
              onChange={(e) => onFactoryTaxChargeChange(e.target.value || undefined)}
            >
              <option value="">{t('lineDetail.noFactoryCharge')}</option>
              {factoryCharges.map((c) => (
                <option key={c.code ?? c.id} value={c.code}>
                  {c.description}
                </option>
              ))}
            </select>
            {selectedCharge && (
              <div className="t-xs text-muted-foreground mt-1">
                {selectedCharge.code === IvaCollectedFactory.PRE_DETERMINED
                  ? 'El impuesto será asumido por la fábrica'
                  : 'El impuesto no será asumido por la fábrica'}
              </div>
            )}
            {factoryAssumedTax > 0 && (
              <div className="text-xs font-semibold text-warning mt-1">
                Asumido: {fmt(factoryAssumedTax)}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
