import { Percent } from 'lucide-react';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel } from '@/components/ui';
import {
  useAllTaxes,
  useAllTaxRates,
  useAllTaxFactors,
  useAllFactoryTaxCharges,
} from '@/hooks/useDataApi';
import { CountryISO } from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LineTax } from '@/types/lineDetail';

interface TaxesTabProps {
  taxes: LineTax[];
  onChange: (taxes: LineTax[]) => void;
  factoryAssumedTax: number;
  totalTaxes: number;
  /** Hacienda factory-tax-charge code string. */
  factoryTaxChargeCode?: string;
  onFactoryTaxChargeChange: (chargeCode: string | undefined) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const IVA_CODES = ['01', '07', '08'];
const IVA_NEEDS_FACTOR = ['08']; // IVARBU
const OTHER_TAX_TYPES_CODES = ['02', '03', '04', '05', '06', '12', '99'];

export function TaxesTab({
  taxes,
  onChange,
  factoryAssumedTax,
  totalTaxes,
  factoryTaxChargeCode,
  onFactoryTaxChargeChange,
  isExpanded,
  onToggle,
}: TaxesTabProps) {
  const { t } = useLanguage();
  const { data: taxTypes } = useAllTaxes({ iso_code: CountryISO.COSTA_RICA });
  const { data: taxRates } = useAllTaxRates({ iso_code: CountryISO.COSTA_RICA });
  const { data: taxFactors } = useAllTaxFactors({ iso_code: CountryISO.COSTA_RICA });
  const { data: factoryTaxCharges } = useAllFactoryTaxCharges({
    iso_code: CountryISO.COSTA_RICA,
    document_version_id: 1,
  });

  const ivaTax = taxes.find((t) => IVA_CODES.includes(t.code ?? ''));
  const otherTaxes = taxes.filter((t) => !IVA_CODES.includes(t.code ?? ''));

  const setIva = (patch: Partial<LineTax>) => {
    const withoutIva = taxes.filter((t) => !IVA_CODES.includes(t.code ?? ''));
    if (patch.code !== undefined || ivaTax) {
      const updatedIva: LineTax = {
        code: ivaTax?.code ?? '',
        rate: 0,
        special_fields: {},
        ...ivaTax,
        ...patch,
      };
      if (updatedIva.code) {
        onChange([...withoutIva, updatedIva]);
      } else {
        onChange(withoutIva);
      }
    }
  };

  const addOther = () => {
    const firstOtherType = (taxTypes ?? []).find((tt: any) =>
      OTHER_TAX_TYPES_CODES.includes(tt.code)
    );
    if (!firstOtherType) return;
    onChange([...taxes, { code: (firstOtherType as any).code, rate: 0, special_fields: {} }]);
  };

  const removeOther = (idx: number) => {
    const items = otherTaxes.filter((_, i) => i !== idx);
    const ivaList = ivaTax ? [ivaTax] : [];
    onChange([...ivaList, ...items]);
  };

  const updateOther = (idx: number, patch: Partial<LineTax>) => {
    const items = otherTaxes.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    const ivaList = ivaTax ? [ivaTax] : [];
    onChange([...ivaList, ...items]);
  };

  return (
    <SectionWrapper
      title={t('lineDetail.taxes')}
      icon={Percent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={taxes.length > 0 ? taxes.length : undefined}
    >
      <div className="flex flex-col gap-3">
        {/* IVA section (required) */}
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold">{t('lineDetail.taxesIvaTitle')}</span>
            <span className="text-[10px] text-destructive">*</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <FormLabel required>{t('lineDetail.ivaType')}</FormLabel>
              <select
                className="pp-input"
                value={ivaTax?.code ?? ''}
                onChange={(e) => setIva({ code: e.target.value || undefined })}
              >
                <option value="">{t('checkout.receiver.idTypePlaceholder')}</option>
                {(taxTypes ?? [])
                  .filter((tt: any) => IVA_CODES.includes(tt.code))
                  .map((tt: any) => (
                    <option key={tt.code} value={tt.code}>
                      {tt.code} — {tt.description}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <FormLabel required>{t('lineDetail.ivaRate')}</FormLabel>
              <select
                className="pp-input"
                value={ivaTax?.rate_code ?? ''}
                onChange={(e) => {
                  const r = (taxRates ?? []).find((r: any) => r.code === e.target.value) as any;
                  setIva({ rate_code: e.target.value || undefined, rate: r?.percentage });
                }}
              >
                <option value="">—</option>
                {(taxRates ?? []).map((r: any) => (
                  <option key={r.code ?? r.id} value={r.code}>
                    {r.percentage}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ivaTax?.code && IVA_NEEDS_FACTOR.includes(ivaTax.code) && (
            <div className="mb-2">
              <FormLabel required>{t('lineDetail.ivarbu')}</FormLabel>
              <select
                className="pp-input"
                value={ivaTax.factor ?? ''}
                onChange={(e) =>
                  setIva({ factor: parseFloat(e.target.value) || undefined })
                }
              >
                <option value="">{t('lineDetail.selectFactor')}</option>
                {(taxFactors ?? []).map((f: any) => (
                  <option key={f.code ?? f.id} value={f.factor ?? f.percentage ?? ''}>
                    {f.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Factory tax charge */}
          <div>
            <FormLabel>{t('lineDetail.factoryCharge')}</FormLabel>
            <select
              className="pp-input"
              value={factoryTaxChargeCode ?? ''}
              onChange={(e) => onFactoryTaxChargeChange(e.target.value || undefined)}
            >
              <option value="">{t('lineDetail.noFactoryCharge')}</option>
              {(factoryTaxCharges ?? []).map((f: any) => (
                <option key={f.code ?? f.id} value={f.code}>
                  {f.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Other taxes */}
        <div>
          <div className="label-section mb-2">{t('products.otherTaxes')}</div>
          {otherTaxes.map((tax, idx) => {
            const tt = (taxTypes ?? []).find((x: any) => x.code === tax.code);
            return (
              <div key={idx} className="border border-border rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold">
                    {tax.code ?? '?'} — {tt?.description ?? t('lineDetail.taxes')}
                  </span>
                  <button
                    onClick={() => removeOther(idx)}
                    className="text-[11px] text-muted-foreground bg-transparent border-0 cursor-pointer hover:text-destructive transition-colors"
                  >
                    {t('common.delete')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FormLabel>{t('lineDetail.discountType')}</FormLabel>
                    <select
                      className="pp-input"
                      value={tax.code ?? ''}
                      onChange={(e) => updateOther(idx, { code: e.target.value })}
                    >
                      {(taxTypes ?? [])
                        .filter((x: any) => OTHER_TAX_TYPES_CODES.includes(x.code))
                        .map((x: any) => (
                          <option key={x.code} value={x.code}>
                            {x.code} — {x.description}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <FormLabel>{t('lineDetail.ivaRate')} %</FormLabel>
                    <input
                      className="pp-input"
                      type="number"
                      value={tax.rate ?? ''}
                      onChange={(e) => updateOther(idx, { rate: parseFloat(e.target.value) || 0 })}
                      min={0}
                      max={100}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={addOther}
            className="w-full h-9 rounded-md border border-dashed border-border text-xs text-muted-foreground bg-transparent cursor-pointer transition-colors hover:border-primary hover:text-primary"
          >
            {t('products.addTax')}
          </button>
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-3 flex flex-col gap-1 text-xs">
          {factoryAssumedTax > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('lineDetail.factoryAssumed')}</span>
              <span className="font-mono">
                ₡{factoryAssumedTax.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>{t('lineDetail.totalTaxes')}</span>
            <span className="font-mono">
              ₡{totalTaxes.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
