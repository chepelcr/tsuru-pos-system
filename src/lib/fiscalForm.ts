/**
 * The fiscal sections shared by the product drawer and the POS line-detail
 * drawer (`components/fiscal/*`) work on ONE shape: the canonical `LineTax` /
 * `LineDiscount` a document line carries. A product IS the template a line is
 * built from, so this is the shape it ends up in anyway.
 *
 * The product form keeps its own `TaxFormEntry` / `DiscountFormEntry` (they
 * hold catalog ids the product API stores and a line never needs), and these
 * adapters are the only place the two shapes meet.
 */
import { TaxTypeCode } from "@/lib/enums";
import type { CabysItem } from "@/services/data-api";
import type { LineDiscount, LineTax } from "@/types/lineDetail";
import type { DiscountFormEntry, TaxFormEntry } from "@/types/productForm";

/** Which drawer a shared fiscal section is rendered in. */
export type FiscalMode = "product" | "line";

/** The IVA family: 01 IVA, 07 IVA cálculo especial, 08 IVA régimen de bienes usados. */
export const IVA_CODES: readonly string[] = [
  TaxTypeCode.IVA,
  TaxTypeCode.IVACE,
  TaxTypeCode.IVARBU,
];

export const isIvaCode = (code?: string): boolean => IVA_CODES.includes(code ?? "");

// ── Taxes ────────────────────────────────────────────────────────────────────

export function taxEntryToLineTax(tx: TaxFormEntry): LineTax {
  return {
    code: tx.taxCode,
    rate: tx.rate,
    rate_code: tx.taxRateCode,
    factor: tx.taxFactor,
    special_fields: tx.specialFields
      ? {
          quantity: tx.specialFields.quantity,
          percentage: tx.specialFields.percentage,
          proportion: tx.specialFields.proportion,
          volume_consumption: tx.specialFields.volumeConsumption,
          tax_amount_id: tx.specialFields.taxAmountId,
          tax_unit_amount: tx.specialFields.taxAmount,
        }
      : undefined,
  };
}

export const taxEntriesToLineTaxes = (entries: TaxFormEntry[]): LineTax[] =>
  entries.map(taxEntryToLineTax);

/**
 * Back from the canonical shape. The IVARBU factor is picked by its VALUE in the
 * shared section, and the product API also stores the factor's catalog id, so
 * the id is resolved from the factor catalog.
 */
export function lineTaxesToTaxEntries(
  taxes: LineTax[],
  factors: ReadonlyArray<{ id: number; factor: number }> = [],
): TaxFormEntry[] {
  return taxes.map((t) => {
    const sf = t.special_fields;
    const hasSpecial =
      !!sf && Object.values(sf).some((v) => v !== undefined && v !== null);
    return {
      taxCode: t.code,
      rate: t.rate ?? 0,
      taxRateCode: t.rate_code,
      taxFactor: t.factor,
      taxFactorId:
        t.factor !== undefined ? factors.find((f) => f.factor === t.factor)?.id : undefined,
      specialFields: hasSpecial
        ? {
            quantity: sf!.quantity,
            percentage: sf!.percentage,
            proportion: sf!.proportion,
            volumeConsumption: sf!.volume_consumption,
            taxAmountId: sf!.tax_amount_id,
            taxAmount: sf!.tax_unit_amount,
          }
        : undefined,
    };
  });
}

// ── Discounts ────────────────────────────────────────────────────────────────

export const discountEntriesToLine = (entries: DiscountFormEntry[]): LineDiscount[] =>
  entries.map((d) => ({
    discount_type: d.discountCode,
    percentage: d.rate,
    reason: d.reason,
  }));

const newDiscountId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Back from the canonical shape, keeping each row's client key by position. */
export const lineDiscountsToEntries = (
  discounts: LineDiscount[],
  previous: DiscountFormEntry[],
): DiscountFormEntry[] =>
  discounts.map((d, i) => ({
    id: previous[i]?.id ?? newDiscountId(),
    discountCode: d.discount_type,
    rate: d.percentage,
    reason: d.reason,
  }));

// ── CABYS → IVA ──────────────────────────────────────────────────────────────

interface RateRow {
  id: number;
  code?: string;
  percentage: number;
}

/**
 * The IVA a CABYS row suggests, applied to a tax list.
 *
 * The CABYS row names its rate, so its id and CODE are preferred over matching
 * the catalog on percentage — the percentage is not a key (exento, no sujeto
 * and crédito pleno are all 0%). An existing IVA-family tax keeps its code
 * (07 and 08 are deliberate choices) and only takes the suggested rate; with
 * none, an 01 IVA is added. A 0% suggestion is applied like any other — it is
 * a real treatment, not "no suggestion".
 */
export function applyCabysIva(
  taxes: LineTax[],
  item: CabysItem,
  rates: ReadonlyArray<RateRow>,
): LineTax[] {
  const suggestedPct = item.tax_rate?.percentage ?? 13;
  const rate =
    rates.find((r) => r.id === item.tax_rate?.id) ??
    rates.find((r) => r.percentage === suggestedPct) ??
    rates[0];
  const suggestion = {
    rate: rate?.percentage ?? suggestedPct,
    rate_code: item.tax_rate?.code ?? rate?.code,
  };

  if (taxes.some((t) => isIvaCode(t.code))) {
    return taxes.map((t) => (isIvaCode(t.code) ? { ...t, ...suggestion } : t));
  }
  return [...taxes, { code: TaxTypeCode.IVA, ...suggestion, special_fields: {} }];
}
