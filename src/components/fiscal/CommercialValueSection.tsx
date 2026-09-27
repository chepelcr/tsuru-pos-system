import type { ReactNode } from "react";
import { DollarSign } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllDiscountTypes } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO, TaxTypeCode } from "@/lib/enums";
import { labelByCode } from "@/lib/catalogLabels";
import { isIvaCode, type FiscalMode } from "@/lib/fiscalForm";
import { formatMoney as fmt } from "@/lib/money";
import type { LineDiscount, LineTax } from "@/types/lineDetail";

/** The figures the tax engine returns for a line (or a product priced as one). */
export interface CommercialAmounts {
  total_amount_line: number;
  base_amount: number;
  iva_tax_total: number;
  other_tax_total: number;
  factory_assumed_tax: number;
}

interface CommercialValueSectionProps {
  mode: FiscalMode;
  /** Price before discounts (a product: its price; a line: price × qty). */
  basePrice: number;
  discounts: LineDiscount[];
  /** Per-discount amounts from the cascade, index-aligned with `discounts`. */
  discountAmounts: number[];
  subtotalAfterDiscount: number;
  taxes: LineTax[];
  /** Null while there is nothing to price (a product with no price yet). */
  amounts: CommercialAmounts | null;
  /** The product's price editor; a line's price is edited in its General tab. */
  priceInput?: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * The breakdown from base price to what the customer pays, from the SAME
 * engines the checkout and the backend use — the caller runs them and passes
 * the result in, so this card never recomputes a figure differently.
 */
export function CommercialValueSection({
  mode,
  basePrice,
  discounts,
  discountAmounts,
  subtotalAfterDiscount,
  taxes,
  amounts,
  priceInput,
  isExpanded,
  onToggle,
  disabled,
}: CommercialValueSectionProps) {
  const { t } = useLanguage();
  const { data: discountTypes } = useAllDiscountTypes({ iso_code: CountryISO.COSTA_RICA });
  const discountTypeRows = (discountTypes ?? []) as { code?: string; description: string }[];

  // The IVA family has three members and they are not the same tax: 01 is
  // ordinary VAT, 07 the special-calculation variant and 08 the used-goods
  // regime. At most ONE is legal per line, so the row is that tax's amount —
  // named after it — rather than a "Total IVA" that could only restate it.
  const ivaCode = taxes.find((tx) => isIvaCode(tx.code))?.code;
  const ivaLabel =
    ivaCode === TaxTypeCode.IVACE
      ? t("lineDetail.ivaSpecialLabel")
      : ivaCode === TaxTypeCode.IVARBU
        ? t("lineDetail.ivaUsedGoodsLabel")
        : t("lineDetail.ivaLabel");

  const totalDiscount = discountAmounts.reduce((sum, a) => sum + a, 0);

  return (
    <SectionWrapper
      title={t(mode === "product" ? "products.commercialPrice" : "lineDetail.commercialValue")}
      icon={DollarSign}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      {priceInput}

      {amounts && basePrice > 0 && (
        <div className="px-4 py-3.5 bg-primary/[0.06] rounded-lg border-[1.5px] border-primary/30">
          <div className="flex justify-between items-center mb-1">
            <span className="t-label !text-primary !mb-0">
              {t(mode === "product" ? "products.estimatedSalePrice" : "lineEditor.lineTotal")}
            </span>
            <span className="text-[22px] font-bold text-primary font-display">
              {fmt(amounts.total_amount_line)}
            </span>
          </div>
          {mode === "product" && (
            <div className="t-xs text-muted-foreground">{t("products.preview.perUnit")}</div>
          )}

          <div className="flex flex-col gap-[3px] mt-3">
            <Row label={t("lineDetail.basePrice")} value={fmt(basePrice)} />

            {discounts.map((d, i) => (
              <Row
                key={i}
                label={`${labelByCode(discountTypeRows, d.discount_type)}${d.percentage ? ` (${d.percentage}%)` : ""}`}
                value={`-${fmt(discountAmounts[i] ?? 0)}`}
                tone="destructive"
              />
            ))}

            {totalDiscount > 0 && (
              <>
                <div className="border-t border-border/40 my-1" />
                <Row label={t("lineDetail.netAfterDiscounts")} value={fmt(subtotalAfterDiscount)} bold />
              </>
            )}

            {ivaCode && (
              <>
                <div className="border-t border-border/40 my-1" />
                <Row label={t("lineDetail.baseForIva")} value={fmt(amounts.base_amount)} bold tone="foreground" />
              </>
            )}

            {amounts.factory_assumed_tax > 0 && (
              <Row
                label={t("lineDetail.factoryAssumed")}
                value={`-${fmt(amounts.factory_assumed_tax)}`}
                tone="warning"
              />
            )}

            {(amounts.iva_tax_total > 0 || amounts.other_tax_total > 0) && (
              <>
                <div className="border-t border-border/50 my-1" />
                {amounts.iva_tax_total > 0 && (
                  <Row label={ivaLabel} value={`+${fmt(amounts.iva_tax_total)}`} bold />
                )}
                {amounts.other_tax_total > 0 && (
                  <Row
                    label={t("lineDetail.totalOtherTaxes")}
                    value={`+${fmt(amounts.other_tax_total)}`}
                    bold
                  />
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
