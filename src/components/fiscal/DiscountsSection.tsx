import { useMemo } from "react";
import { Tag } from "lucide-react";
import { FormLabel, Icon, Select } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllDiscountTypes } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO, DiscountTypeCode } from "@/lib/enums";
import type { FiscalMode } from "@/lib/fiscalForm";
import { formatMoney as fmt } from "@/lib/money";
import { formatPercent } from "@/lib/percent";
import { DiscountCalculationService } from "@/services/discountCalculationService";
import type { DiscountTypeResponse } from "@/services/data-api/dtos";
import type { LineDiscount } from "@/types/lineDetail";

interface DiscountsSectionProps {
  mode: FiscalMode;
  discounts: LineDiscount[];
  onChange: (discounts: LineDiscount[]) => void;
  /** What the discounts apply to (a product: its price; a line: price × qty). */
  basePrice: number;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * The line's or product's discounts, previewed through the real cascade.
 *
 * Discounts CASCADE — 10% then 5% on 1000 is 855, not 850 — so every figure
 * here (per row and total) comes from `DiscountCalculationService`, the engine
 * the checkout and the backend run, never from `base × rate`.
 *
 * "Razón" belongs to nature 99 and nothing else: Note 20 requires
 * NaturalezaDescuento for "Otros" only, and `discount_service` emits
 * <CodigoDescuentoOtros> only for "99". Known natures carry the catalog
 * description as their reason.
 */
export function DiscountsSection({
  mode,
  discounts,
  onChange,
  basePrice,
  isExpanded,
  onToggle,
  disabled,
}: DiscountsSectionProps) {
  const { t } = useLanguage();
  const { data: discountTypesData } = useAllDiscountTypes({ iso_code: CountryISO.COSTA_RICA });
  const discountTypes: DiscountTypeResponse[] = discountTypesData ?? [];

  const reasonFor = (code: string) =>
    code === DiscountTypeCode.OTHER
      ? ""
      : (discountTypes.find((d) => d.code === code)?.description ?? "");

  const add = (code: string) =>
    // Rate left empty so the input shows its placeholder until typed.
    onChange([...discounts, { discount_type: code, percentage: undefined, reason: reasonFor(code) }]);
  const remove = (i: number) => onChange(discounts.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<LineDiscount>) =>
    onChange(discounts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const result = useMemo(() => {
    try {
      return DiscountCalculationService.calculate(basePrice, discounts);
    } catch {
      // A missing Nota-20 reason throws; that is flagged on the row itself and
      // the totals should not blank out while it is being typed.
      return null;
    }
  }, [basePrice, discounts]);

  const totalAmount = result?.totalDiscountAmount ?? 0;
  // The EFFECTIVE rate off the base, which is what the cascade produced.
  const totalPct =
    basePrice > 0
      ? (totalAmount / basePrice) * 100
      : discounts.reduce((sum, d) => sum + (d.percentage ?? 0), 0);

  return (
    <SectionWrapper
      title={t("products.discounts")}
      icon={Tag}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      badge={discounts.length > 0 ? discounts.length : undefined}
    >
      <div className="flex flex-col gap-2.5">
        {discounts.length === 0 && mode === "product" && (
          <div className="t-xs text-muted-foreground py-1">{t("products.noDiscountsHint")}</div>
        )}

        {discounts.map((disc, i) => {
          const isOther = disc.discount_type === DiscountTypeCode.OTHER;
          const reasonEmpty = isOther && !(disc.reason && disc.reason.trim());
          const amount = result?.perDiscount[i]?.amount ?? 0;

          return (
            <div key={i} className="px-3 py-2 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Select
                  className="pp-input flex-1 !h-auto !py-[3px] text-xs"
                  aria-label={t("lineDetail.discountType")}
                  value={disc.discount_type}
                  onChange={(e) =>
                    update(i, { discount_type: e.target.value, reason: reasonFor(e.target.value) })
                  }
                >
                  {discountTypes.map((d) => (
                    <option key={d.code ?? d.id} value={d.code ?? ""}>
                      {d.description}
                    </option>
                  ))}
                </Select>
                <input
                  type="number"
                  className="pp-input w-[72px] !h-auto !px-2 !py-[3px] text-xs"
                  aria-label={t("lineDetail.percentage")}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  value={disc.percentage ?? ""}
                  onChange={(e) =>
                    update(i, {
                      percentage: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
                <span className="text-[11px] text-muted-foreground">%</span>
                {basePrice > 0 && (
                  <span className="min-w-[64px] text-xs font-semibold text-destructive text-right">
                    -{fmt(amount)}
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  aria-label={t("common.delete")}
                  onClick={() => remove(i)}
                >
                  <Icon name="xCircle" size={14} />
                </button>
              </div>

              {isOther && (
                <div className="mt-1.5">
                  <FormLabel required>{t("discount.reason.label")}</FormLabel>
                  <input
                    type="text"
                    className="pp-input text-xs"
                    placeholder={t("discount.reason.placeholder")}
                    value={disc.reason ?? ""}
                    onChange={(e) => update(i, { reason: e.target.value })}
                    required
                  />
                  {reasonEmpty && (
                    <div className="text-[11px] text-destructive mt-1">
                      {t("discount.reason.required")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {discounts.length > 0 && (
          <div className="flex justify-end items-center gap-2">
            <span className="t-xs text-muted-foreground">{t("products.discountTotal")}</span>
            <span className={`text-[13px] font-bold ${totalPct > 100 ? "text-destructive" : "text-foreground"}`}>
              {formatPercent(totalPct)}
            </span>
            {basePrice > 0 && (
              <span className="text-xs font-semibold text-destructive">-{fmt(totalAmount)}</span>
            )}
            {totalPct > 100 && (
              <span className="text-[11px] text-destructive">{t("products.discountExceeds")}</span>
            )}
          </div>
        )}

        <Select className="pp-input" value="" onChange={(e) => e.target.value && add(e.target.value)}>
          <option value="">{t("products.addDiscount")}</option>
          {discountTypes.map((d) => (
            <option key={d.code ?? d.id} value={d.code ?? ""}>
              {d.description}
            </option>
          ))}
        </Select>
      </div>
    </SectionWrapper>
  );
}
