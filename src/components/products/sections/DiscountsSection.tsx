import { Tag } from "lucide-react";
import { Icon, FormLabel } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useAllDiscountTypes } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO, DiscountTypeCode } from "@/lib/enums";
import { labelByCode } from "@/lib/catalogLabels";
import type { DiscountFormEntry } from "@/types/productForm";

const ISO = CountryISO.COSTA_RICA;
const fmt = (n: number) => "₡" + Math.round(n).toLocaleString("es-CR");

interface DiscountsSectionProps {
  discounts: DiscountFormEntry[];
  basePrice?: number;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onAdd: (entry: DiscountFormEntry) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<DiscountFormEntry>) => void;
}

export function DiscountsSection({
  discounts,
  basePrice = 0,
  isExpanded,
  onToggle,
  disabled,
  onAdd,
  onRemove,
  onUpdate,
}: DiscountsSectionProps) {
  const { t } = useLanguage();
  const { data: discountTypesData } = useAllDiscountTypes({ iso_code: ISO });
  const discountTypeList = discountTypesData ?? [];

  const totalPct = discounts.reduce((sum, d) => sum + (d.rate ?? 0), 0);
  const totalExceeds = totalPct > 100;
  const totalAmount = basePrice * totalPct / 100;

  const grouped = discounts.reduce<Record<string, DiscountFormEntry[]>>((acc, d) => {
    if (!acc[d.discountCode]) acc[d.discountCode] = [];
    acc[d.discountCode].push(d);
    return acc;
  }, {});
  const groupCodes = Object.keys(grouped);

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
        {discounts.length === 0 && (
          <div className="t-xs text-muted-foreground py-1">
            {t("products.noDiscountsHint")}
          </div>
        )}

        {groupCodes.map((typeCode) => {
          const group = grouped[typeCode];
          const typeName = labelByCode(
            discountTypeList as { code?: string; description: string }[],
            typeCode,
          );
          const isOtros = typeCode === DiscountTypeCode.OTHER;

          return (
            <div key={typeCode}>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em] mb-1">
                {typeName}
              </div>

              <div className="flex flex-col gap-1.5">
                {group.map((disc) => {
                  const discAmount = basePrice * (disc.rate ?? 0) / 100;
                  const reasonEmpty =
                    isOtros && !(disc.reason && disc.reason.trim());
                  return (
                    <div
                      key={disc.id}
                      className="px-3 py-2 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="pp-input w-[72px] !h-auto !px-2 !py-[3px] text-xs"
                          placeholder="0"
                          min={0}
                          max={100}
                          value={disc.rate ?? ""}
                          onChange={(e) =>
                            onUpdate(disc.id, {
                              rate: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <span className="text-[11px] text-muted-foreground">%</span>

                        {basePrice > 0 && (
                          <span className="flex-1 text-xs font-semibold text-destructive text-right">
                            -{fmt(discAmount)}
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => onRemove(disc.id)}
                        >
                          <Icon name="xCircle" size={14} />
                        </button>
                      </div>

                      <div className="mt-1.5">
                        <FormLabel required={isOtros}>{t("discount.reason.label")}</FormLabel>
                        <input
                          type="text"
                          className="pp-input text-xs"
                          placeholder={t("discount.reason.placeholder")}
                          value={disc.reason ?? ""}
                          onChange={(e) =>
                            onUpdate(disc.id, { reason: e.target.value })
                          }
                          required={isOtros}
                        />
                        {reasonEmpty && (
                          <div className="text-[11px] text-destructive mt-1">
                            {t("discount.reason.required")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {discounts.length > 0 && (
          <div className="flex justify-end items-center gap-2">
            <span className="t-xs text-muted-foreground">{t("products.discountTotal")}</span>
            <span className={`text-[13px] font-bold ${totalExceeds ? "text-destructive" : "text-foreground"}`}>
              {totalPct.toFixed(1)}%
            </span>
            {basePrice > 0 && (
              <span className="text-xs font-semibold text-destructive">
                -{fmt(totalAmount)}
              </span>
            )}
            {totalExceeds && (
              <span className="text-[11px] text-destructive">
                {t("products.discountExceeds")}
              </span>
            )}
          </div>
        )}

        <select
          className="pp-input"
          value=""
          onChange={(e) => {
            const dt = discountTypeList.find(
              (d: { code?: string }) => (d.code ?? "") === e.target.value
            );
            if (dt) {
              const code = (dt as { code?: string }).code ?? "";
              const isOther = code === DiscountTypeCode.OTHER;
              onAdd({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                discountCode: code,
                // Leave rate undefined so the input shows its placeholder
                // until the user actually types a value.
                rate: undefined,
                // Auto-fill `reason` for known codes (01/02/03); leave empty
                // for code 99 (OTHER) so the user enters their own Nota-20
                // nature text.
                reason: isOther ? "" : dt.description,
              });
            }
          }}
        >
          <option value="">{t("products.addDiscount")}</option>
          {discountTypeList.map((dt: { code?: string; description: string }) => (
            <option key={dt.code ?? ""} value={dt.code ?? ""}>
              {dt.description}
            </option>
          ))}
        </select>
      </div>
    </SectionWrapper>
  );
}
