import { useEffect } from "react";
import { DollarSign } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel, MoneyInput } from "@/components/ui";
import { useProductLineAmounts } from "@/hooks/useProductLineAmounts";
import { useAllTaxes, useAllDiscountTypes } from "@/hooks/useDataApi";
import { CountryISO, TaxTypeCode } from "@/lib/enums";
import { useLanguage } from "@/contexts/LanguageContext";
import { labelByCode } from "@/lib/catalogLabels";
import type { TaxResponse } from "@/services/data-api/dtos";
import type { TaxFormEntry, DiscountFormEntry, ProductFormState } from "@/types/productForm";
import { formatMoney as fmt } from "@/lib/money";

const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

interface CommercialValueSectionProps {
  form: ProductFormState;
  taxes: TaxFormEntry[];
  discounts: DiscountFormEntry[];
  hasFactoryTax?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onChange: (patch: Partial<ProductFormState>) => void;
  /**
   * Surfaces preview discount-validation errors to the parent so the drawer
   * can render them inline and block save.
   */
  onValidationChange?: (errors: string[]) => void;
}

export function CommercialValueSection({
  form,
  taxes,
  discounts,
  hasFactoryTax,
  isExpanded,
  onToggle,
  disabled,
  onChange,
  onValidationChange,
}: CommercialValueSectionProps) {
  const { t } = useLanguage();
  const { data: taxTypes } = useAllTaxes({ iso_code: CountryISO.COSTA_RICA });
  const { data: discountTypes } = useAllDiscountTypes({ iso_code: CountryISO.COSTA_RICA });
  const taxTypeRows = (taxTypes ?? []) as TaxResponse[];
  const discountTypeRows = (discountTypes ?? []) as { code?: string; description: string }[];
  const price = Number(form.price) || 0;

  // Project the product-form internal shape into the canonical LineTax /
  // LineDiscount shapes the calc service expects.
  // One calculation for the whole product form — the same engines, in the same
  // order, that the line-detail drawer and the backend use. See
  // `useProductLineAmounts`; the per-discount amounts below come from the
  // CASCADE it ran, not from a second pass over the raw percentages.
  const { amounts: calc, discount: discountInfo, error: discountError } =
    useProductLineAmounts({
      price,
      taxes,
      discounts,
      cabys: form.cabys || undefined,
      hasFactoryTax,
      baseAmountOverride: form.baseAmount ? Number(form.baseAmount) : undefined,
      taxTypes: taxTypeRows,
    });

  useEffect(() => {
    if (!onValidationChange) return;
    onValidationChange(discountError ? [t(discountError.message)] : []);
  }, [discountError, onValidationChange, t]);

  // Cascaded, not `price × rate` each. Discounts apply to the RUNNING balance
  // — 10% then 5% on 1000 is 855, not 850 — so the per-line figures shown here
  // used to add up to a different number than the total the engine computed
  // right beside them.
  const discountLines = discounts.map((d, index) => ({
    label: labelByCode(discountTypeRows, d.discountCode),
    rate: d.rate ?? 0,
    amount: discountInfo?.perDiscount[index]?.amount ?? 0,
  }));
  const totalDiscountAmount = discountInfo?.totalDiscountAmount ?? 0;

  const netPrice = discountInfo?.subtotalAfterDiscount ?? price;

  const ivaTaxes = taxes.filter((t) => IVA_CODES.includes(t.taxCode));
  const otherTaxes = taxes.filter((t) => !IVA_CODES.includes(t.taxCode));

  const baseAmount = calc?.base_amount ?? netPrice;
  const ivaLines = ivaTaxes.map((tx) => ({
    label: labelByCode(taxTypeRows, tx.taxCode),
    amount: tx.taxCode === TaxTypeCode.IVACE || tx.taxCode === TaxTypeCode.IVA
      ? (calc?.iva_tax_total ?? baseAmount * tx.rate / 100) / Math.max(ivaTaxes.length, 1)
      : baseAmount * tx.rate / 100,
  }));

  const otherTaxLines = otherTaxes.map((tx) => ({
    label: labelByCode(taxTypeRows, tx.taxCode),
    amount: tx.rate > 0 ? price * tx.rate / 100 : 0,
  }));

  const salePrice = calc?.total_amount_line ?? price;
  const factoryAssumedTax = calc?.factory_assumed_tax ?? 0;

  return (
    <SectionWrapper
      title={t("products.commercialPrice")}
      icon={DollarSign}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      {/* Base price input */}
      <div>
        <FormLabel required>{t("products.basePriceNoTax")}</FormLabel>
        <MoneyInput
          placeholder="0"
          min={0}
          value={form.price}
          onChange={(price) => onChange({ price })}
        />
      </div>

      {price > 0 && (
        <div className="px-4 py-3.5 bg-primary/[0.06] rounded-lg border-[1.5px] border-primary/30">
          <div className="flex justify-between items-center mb-1">
            <span className="t-label !text-primary !mb-0">
              {t("products.estimatedSalePrice")}
            </span>
            <span className="text-[22px] font-bold text-primary font-display">
              {fmt(salePrice)}
            </span>
          </div>
          <div className="t-xs text-muted-foreground mb-3">
            {t("products.preview.perUnit")}
          </div>

          <div className="flex flex-col gap-[3px]">
            <Row label={t("products.basePriceLine")} value={fmt(price)} />

            {discountLines.map((d, i) => (
              <Row
                key={i}
                label={`${d.label}${d.rate > 0 ? ` (${d.rate}%)` : ""}`}
                value={`-${fmt(d.amount)}`}
                tone="destructive"
              />
            ))}

            {totalDiscountAmount > 0 && (
              <Row label={t("products.netPrice")} value={fmt(netPrice)} bold />
            )}

            {otherTaxLines.map((t, i) => (
              <Row
                key={i}
                label={t.label}
                value={t.amount > 0 ? `+${fmt(t.amount)}` : "—"}
              />
            ))}

            {ivaTaxes.length > 0 && (
              <>
                <div className="border-t border-border/40 my-1" />
                <Row
                  label={t("products.baseForIva")}
                  value={fmt(baseAmount)}
                  bold
                  tone="foreground"
                />
              </>
            )}

            {ivaLines.map((t, i) => (
              <Row key={i} label={t.label} value={`+${fmt(t.amount)}`} />
            ))}

            {factoryAssumedTax > 0 && (
              <Row
                label={t("products.factoryAssumedTax")}
                value={`-${fmt(factoryAssumedTax)}`}
                tone="warning"
              />
            )}

            {(ivaTaxes.length > 0 || otherTaxes.length > 0) && (
              <>
                <div className="border-t border-border/50 my-1" />
                {(calc?.iva_tax_total ?? 0) > 0 && (
                  <Row label={t("products.totalIva")} value={`+${fmt(calc!.iva_tax_total)}`} bold />
                )}
                {(calc?.other_tax_total ?? 0) > 0 && (
                  <Row label={t("products.totalOtherTaxes")} value={`+${fmt(calc!.other_tax_total)}`} bold />
                )}
              </>
            )}
          </div>
        </div>
      )}
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
