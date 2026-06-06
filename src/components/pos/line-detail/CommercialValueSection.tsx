import { DollarSign } from 'lucide-react';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { useLanguage } from '@/contexts/LanguageContext';
import { TaxTypeCode } from '@/lib/enums';
import type { LineDetail } from '@/types/lineDetail';

const fmt = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR');
const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

interface CommercialValueSectionProps {
  detail: LineDetail;
  subtotalAfterDiscount: number;
  lineAmounts: {
    total_amount_line: number;
    net_tax: number;
    factory_assumed_tax: number;
    base_amount: number;
    iva_tax_total: number;
    other_tax_total: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
}

export function CommercialValueSection({
  detail,
  subtotalAfterDiscount,
  lineAmounts,
  isExpanded,
  onToggle
}: CommercialValueSectionProps) {
  const { t } = useLanguage();

  const basePrice = detail.net_price * detail.quantity;
  const discountAmount = basePrice - subtotalAfterDiscount;
  const totalLine = lineAmounts.total_amount_line;
  const factoryAssumedTax = lineAmounts.factory_assumed_tax;
  const baseAmount = lineAmounts.base_amount;
  const ivaTaxTotal = lineAmounts.iva_tax_total;
  const otherTaxTotal = lineAmounts.other_tax_total;

  const hasIvaTaxes = detail.taxes.some((t) => IVA_CODES.includes(t.code ?? ''));

  return (
    <SectionWrapper
      title={t('lineDetail.commercialValue')}
      icon={DollarSign}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="px-4 py-3.5 bg-primary/[0.06] rounded-lg border-[1.5px] border-primary/30">
        <div className="flex justify-between items-center mb-3">
          <span className="t-label !text-primary">{t('lineEditor.lineTotal')}</span>
          <span className="text-[22px] font-bold text-primary font-display">
            {fmt(totalLine)}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <Row label={t('lineDetail.basePrice')} value={fmt(basePrice)} />

          {discountAmount > 0 && (
            <Row
              label={t('lineDetail.discountsLabel')}
              value={`-${fmt(discountAmount)}`}
              tone="destructive"
            />
          )}

          {discountAmount > 0 && (
            <>
              <div className="border-t border-border/40 my-1" />
              <Row
                label={t('lineDetail.netAfterDiscounts')}
                value={fmt(subtotalAfterDiscount)}
                bold
              />
            </>
          )}

          {hasIvaTaxes && (
            <>
              <div className="border-t border-border/40 my-1" />
              <Row
                label={t('lineDetail.baseForIva')}
                value={fmt(baseAmount)}
                bold
                tone="foreground"
              />
            </>
          )}

          {factoryAssumedTax > 0 && (
            <Row
              label={t('lineDetail.factoryAssumed')}
              value={`-${fmt(factoryAssumedTax)}`}
              tone="warning"
            />
          )}

          {(ivaTaxTotal > 0 || otherTaxTotal > 0) && (
            <>
              <div className="border-t border-border/50 my-1" />
              {ivaTaxTotal > 0 && (
                <Row label={t('products.totalIva')} value={`+${fmt(ivaTaxTotal)}`} bold />
              )}
              {otherTaxTotal > 0 && (
                <Row label={t('lineDetail.totalOtherTaxes')} value={`+${fmt(otherTaxTotal)}`} bold />
              )}
            </>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}

function Row({
  label,
  value,
  tone = "muted",
  bold,
}: {
  label: string;
  value: string;
  tone?: "muted" | "foreground" | "destructive" | "warning";
  bold?: boolean;
}) {
  const toneClass = {
    muted: "text-muted-foreground",
    foreground: "text-foreground",
    destructive: "text-destructive",
    warning: "text-warning",
  }[tone];
  return (
    <div className="flex justify-between items-center">
      <span className={`t-xs ${toneClass} ${bold ? "font-bold" : ""}`}>{label}</span>
      <span className={`t-xs ${toneClass} ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
