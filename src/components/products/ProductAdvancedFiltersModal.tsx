import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FiltersModal } from "@/components/common/FiltersModal";
import { RangeSlider } from "@/components/common/RangeSlider";
import { useProductPriceBounds } from "@/hooks/useProducts";

/**
 * Advanced filters for products — price (single comparison OR range) + sort.
 * Search term, category and status live on the toolbar itself (most common)
 * and are NOT duplicated here.
 *
 * Two price modes:
 *  - `single`: operator (`=` / `>` / `<`) + one value, matches the BE's strict
 *    comparison semantics (see `SearchOperations` in cross-app-be).
 *  - `range`:  numeric inputs + dual-handle slider sized to the org's actual
 *    price bounds (fetched from `/products/price-bounds`).
 *
 * The compiled BE filter is owned by `ProductsPage`; this modal only stores
 * the user's intent.
 */

export type PriceMode = "single" | "range";
export type PriceOperator = "=" | ">" | "<";

export interface ProductAdvancedFilters {
  priceMode?: PriceMode;
  /** Single-mode only. */
  priceOp?: PriceOperator;
  /** Single-mode only. */
  priceValue?: number;
  /** Range-mode only. */
  priceMin?: number;
  /** Range-mode only. */
  priceMax?: number;
  /** Backend orderBy syntax: `>field` (asc) or `<field` (desc). */
  sort?: string;
}

interface Props {
  open: boolean;
  orgId: string;
  filters: ProductAdvancedFilters;
  onApply: (next: ProductAdvancedFilters) => void;
  onClose: () => void;
}

const DEFAULT_RANGE_FALLBACK: [number, number] = [0, 1_000_000];

export function ProductAdvancedFiltersModal({ open, orgId, filters, onApply, onClose }: Props) {
  const { t } = useLanguage();
  const { data: bounds } = useProductPriceBounds(open ? orgId : undefined);
  const [local, setLocal] = useState<ProductAdvancedFilters>({ ...filters });
  const patch = (p: Partial<ProductAdvancedFilters>) => setLocal((f) => ({ ...f, ...p }));

  useEffect(() => { if (open) setLocal({ ...filters }); }, [open, filters]);

  // Floor / ceiling for the slider — round to whole colones since the BE stores
  // `price` as Integer. Fall back to a sensible default when bounds aren't yet
  // loaded or the org has no products.
  const [sliderMin, sliderMax] = useMemo<[number, number]>(() => {
    const lo = bounds?.net_min;
    const hi = bounds?.net_max;
    if (lo == null || hi == null || hi <= lo) return DEFAULT_RANGE_FALLBACK;
    return [Math.floor(lo), Math.ceil(hi)];
  }, [bounds]);

  const mode: PriceMode = local.priceMode ?? "range";

  // Slider derives its current value from the user's draft, clamped to the
  // bounds so a stale stored filter still renders inside the track.
  const sliderValue: [number, number] = useMemo(() => {
    const lo = Math.max(sliderMin, local.priceMin ?? sliderMin);
    const hi = Math.min(sliderMax, local.priceMax ?? sliderMax);
    return [lo, hi];
  }, [local.priceMin, local.priceMax, sliderMin, sliderMax]);

  const setMode = (next: PriceMode) => {
    // Clear the other-mode fields so a stale value can't leak into the search filter.
    if (next === "single") {
      patch({
        priceMode: "single",
        priceOp: local.priceOp ?? "=",
        priceValue: local.priceValue,
        priceMin: undefined,
        priceMax: undefined,
      });
    } else {
      patch({ priceMode: "range", priceValue: undefined, priceOp: undefined });
    }
  };

  const fmt = (n: number) => n.toLocaleString("es-CR");

  return (
    <FiltersModal
      open={open}
      onClose={onClose}
      title={t("products.advancedFilters")}
      onClear={() => setLocal({})}
      onApply={() => { onApply(local); onClose(); }}
      applyLabel={t("products.applyFilters")}
    >
      {/* Price filter — label on the left, mode toggle right-aligned. */}
      <div className="flex items-center justify-between gap-3">
        <label className="t-label">{t("products.priceFilter")}</label>
        <div
          className="inline-flex items-center rounded-md border border-border bg-card p-0.5 h-9 shrink-0"
          role="tablist"
        >
          {(["single", "range"] as PriceMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-7 px-3 rounded text-[12px] font-semibold transition-colors ${
                mode === m
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(m === "single" ? "products.priceSingle" : "products.priceRange")}
            </button>
          ))}
        </div>
      </div>

      {/* Single — operator + value */}
      {mode === "single" && (
        <div className="grid grid-cols-[80px_1fr] gap-2 items-end">
          <div className="space-y-1">
            <label className="t-label">{t("products.priceOperator")}</label>
            <select
              value={local.priceOp ?? "="}
              onChange={(e) => patch({ priceOp: e.target.value as PriceOperator })}
              className="pp-input"
            >
              <option value="=">=</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="t-label">{t("products.priceValue")}</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={local.priceValue ?? ""}
              onChange={(e) =>
                patch({ priceValue: e.target.value ? Number(e.target.value) : undefined })
              }
              className="pp-input"
              placeholder="0"
            />
          </div>
        </div>
      )}

      {/* Range — inputs + slider */}
      {mode === "range" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="t-label">{t("products.priceMin")}</label>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                inputMode="numeric"
                value={local.priceMin ?? ""}
                onChange={(e) =>
                  patch({ priceMin: e.target.value ? Number(e.target.value) : undefined })
                }
                className="pp-input"
                placeholder={fmt(sliderMin)}
              />
            </div>
            <div className="space-y-1">
              <label className="t-label">{t("products.priceMax")}</label>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                inputMode="numeric"
                value={local.priceMax ?? ""}
                onChange={(e) =>
                  patch({ priceMax: e.target.value ? Number(e.target.value) : undefined })
                }
                className="pp-input"
                placeholder={fmt(sliderMax)}
              />
            </div>
          </div>
          <RangeSlider
            min={sliderMin}
            max={sliderMax}
            value={sliderValue}
            onChange={([lo, hi]) => patch({ priceMin: lo, priceMax: hi })}
            format={fmt}
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="t-label">{t("products.sortBy")}</label>
        <select
          value={local.sort ?? ""}
          onChange={(e) => patch({ sort: e.target.value || undefined })}
          className="pp-input"
        >
          <option value="">{t("products.sortDefault")}</option>
          <option value=">name">{t("products.sortNameAsc")}</option>
          <option value="<name">{t("products.sortNameDesc")}</option>
          <option value=">price">{t("products.sortPriceAsc")}</option>
          <option value="<price">{t("products.sortPriceDesc")}</option>
          <option value="<updated_on">{t("products.sortUpdatedDesc")}</option>
        </select>
      </div>
    </FiltersModal>
  );
}
