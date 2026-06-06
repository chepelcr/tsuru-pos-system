import { Tag } from 'lucide-react';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { FormLabel } from '@/components/ui';
import { useAllDiscountTypes } from '@/hooks/useDataApi';
import { CountryISO, DiscountTypeCode } from '@/lib/enums';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LineDiscount } from '@/types/lineDetail';
import type { DiscountTypeResponse } from '@/services/data-api/dtos';

interface DiscountsTabProps {
  discounts: LineDiscount[];
  netPrice: number;
  quantity: number;
  onChange: (discounts: LineDiscount[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DiscountsTab({ discounts, netPrice, quantity, onChange, isExpanded, onToggle }: DiscountsTabProps) {
  const { t } = useLanguage();
  const { data: discountTypesData } = useAllDiscountTypes({ iso_code: CountryISO.COSTA_RICA });
  const discountTypes: DiscountTypeResponse[] = discountTypesData ?? [];

  const add = () => {
    const first = discountTypes[0];
    const code = first?.code ?? DiscountTypeCode.ROYALTY;
    onChange([
      ...discounts,
      {
        discount_type: code,
        percentage: 0,
        // Auto-fill `reason` from the catalog description for known codes.
        // Code 99 (OTHER) requires manual entry, so leave it blank.
        reason: code === DiscountTypeCode.OTHER ? '' : (first?.description ?? ''),
      },
    ]);
  };
  const remove = (i: number) => onChange(discounts.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<LineDiscount>) =>
    onChange(discounts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  // On discount-type select: auto-fill `reason` for known codes; clear it on
  // switch to 99 (OTHER) so the user enters their own Nota-20 nature text.
  const onTypeChange = (i: number, newCode: string) => {
    const picked = discountTypes.find((d) => d.code === newCode);
    const isOther = newCode === DiscountTypeCode.OTHER;
    update(i, {
      discount_type: newCode,
      reason: isOther ? '' : (picked?.description ?? ''),
    });
  };

  const total_pct = discounts.reduce((s, d) => s + (d.percentage || 0), 0);
  const total_amt = discounts.reduce(
    (s, d) => s + (netPrice * quantity * (d.percentage || 0)) / 100,
    0,
  );

  return (
    <SectionWrapper
      title={t('products.discounts')}
      icon={Tag}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={discounts.length > 0 ? discounts.length : undefined}
    >
      <div className="flex flex-col gap-3">
        {discounts.map((disc, i) => {
          const dt = discountTypes.find((d) => d.code === disc.discount_type);
          const isOther = disc.discount_type === DiscountTypeCode.OTHER;
          const reason_empty =
            isOther && !(disc.reason && disc.reason.trim());
          const disc_amount = (netPrice * quantity * (disc.percentage || 0)) / 100;

          return (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold">{dt?.description ?? t('products.discounts')}</span>
                <button
                  onClick={() => remove(i)}
                  className="text-[11px] text-muted-foreground bg-transparent border-0 cursor-pointer hover:text-destructive transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <FormLabel required>{t('lineDetail.discountType')}</FormLabel>
                  <select
                    className="pp-input"
                    value={disc.discount_type ?? ''}
                    onChange={(e) => onTypeChange(i, e.target.value)}
                  >
                    {discountTypes.map((d) => (
                      <option key={d.code ?? d.id} value={d.code}>{d.description}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FormLabel required>{t('lineDetail.percentage')} %</FormLabel>
                  <input
                    className="pp-input"
                    type="number"
                    value={disc.percentage}
                    onChange={(e) => update(i, { percentage: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    step={0.01}
                  />
                </div>
              </div>

              <div>
                <FormLabel required={isOther}>{t('discount.reason.label')}</FormLabel>
                <input
                  className="pp-input"
                  value={disc.reason ?? ''}
                  onChange={(e) => update(i, { reason: e.target.value })}
                  placeholder={t('discount.reason.placeholder')}
                  required={isOther}
                />
                {reason_empty && (
                  <div className="text-[11px] text-destructive mt-1">
                    {t('discount.reason.required')}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground text-right mt-1">
                ₡{disc_amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}

        <button
          onClick={add}
          className="w-full h-9 rounded-md border border-dashed border-border text-xs text-muted-foreground bg-transparent cursor-pointer transition-colors hover:border-primary hover:text-primary"
        >
          {t('products.addDiscount')}
        </button>

        {discounts.length > 0 && (
          <div className="border-t border-border pt-3 flex flex-col gap-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{t('lineDetail.totalPercentage')}</span>
              <span className="font-mono">{total_pct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>{t('lineDetail.totalDiscounts')}</span>
              <span className="font-mono">₡{total_amt.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
            </div>
            {total_pct > 100 && (
              <div className="text-[11px] text-destructive">{t('products.discountExceeds')}</div>
            )}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
