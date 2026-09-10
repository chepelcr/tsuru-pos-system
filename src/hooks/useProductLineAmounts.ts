import { useMemo } from "react";
import {
  DiscountCalculationService,
  DiscountValidationError,
} from "@/services/discountCalculationService";
import {
  TaxCalculationService,
  type LineAmountsResult,
  type LineDiscount,
  type LineTax,
  type TaxAmountsById,
} from "@/services/taxCalculationService";
import { IvaCollectedFactory } from "@/lib/enums";
import type { DiscountFormEntry, TaxFormEntry } from "@/types/productForm";

interface UseProductLineAmountsArgs {
  price: number;
  taxes: TaxFormEntry[];
  discounts: DiscountFormEntry[];
  cabys?: string;
  hasFactoryTax?: boolean;
  /** Manual `base_amount` override — tax code 07 / IVACobradoFabrica 01 only. */
  baseAmountOverride?: number;
  /** data-api tax-type catalog rows. */
  taxTypes: Array<{ code?: string; id?: number | string; description?: string }>;
}

export interface ProductLineAmounts {
  amounts: LineAmountsResult | null;
  /** Cascaded discount result — per-discount amounts, routing flags. */
  discount: ReturnType<typeof DiscountCalculationService.calculate> | null;
  /** Message when the discount cascade is invalid (nature 99 with no reason). */
  error: DiscountValidationError | null;
}

/**
 * A product priced through the same engines a sale line goes through.
 *
 * A product IS the template a `DetalleLinea` is built from, so the figures it
 * previews have to come from the same place the document's do — otherwise the
 * catalog screen, the checkout and the backend each answer the same question
 * differently, and only the last one is binding.
 *
 * Two things this centralises that the product form previously got wrong:
 *
 *   * **the discount cascade runs first.** Discounts apply to the running
 *     balance, not to the original price (10% then 5% on 1000 is 855, not 850),
 *     and the tax base is what is left after them. The form used to hand the
 *     tax service the PRE-discount price.
 *   * **routing flags come from the cascade, not from the discount list.**
 *     `TaxCalculationService` ignores its `discounts` argument for routing by
 *     design — natures 01/03 move the IVA into `ImpuestoAsumidoEmisorFabrica`,
 *     and that decision belongs to the discount service. Passing the raw list
 *     meant a royalty on a product never routed at all.
 *
 * Quantity is fixed at 1 throughout: a product is the template for a line, not
 * a line, so there is nothing to multiply by. Everything else — special-tax
 * unit amounts, the CABYS branch, the editable base, the factory flag —
 * behaves exactly as it does in the line-detail drawer.
 */
export function useProductLineAmounts({
  price,
  taxes,
  discounts,
  cabys,
  hasFactoryTax = false,
  baseAmountOverride,
  taxTypes,
}: UseProductLineAmountsArgs): ProductLineAmounts {
  const taxEntries: LineTax[] = useMemo(
    () =>
      taxes.map((tx) => ({
        code: tx.taxCode,
        rate: tx.rate,
        rate_code: tx.taxRateCode,
        factor: tx.taxFactor,
        special_fields: tx.specialFields
          ? {
              quantity: tx.specialFields.quantity,
              percentage: tx.specialFields.percentage,
              volume_consumption: tx.specialFields.volumeConsumption,
              tax_amount_id: tx.specialFields.taxAmountId,
              tax_unit_amount: tx.specialFields.taxAmount,
            }
          : undefined,
      })),
    [taxes],
  );

  const discountEntries: LineDiscount[] = useMemo(
    () =>
      discounts.map((d) => ({
        discount_type: d.discountCode,
        percentage: d.rate ?? 0,
        reason: d.reason,
      })),
    [discounts],
  );

  // Per-unit amounts for the specific excises, flattened the way the tax
  // service wants them. Same shape the line-detail drawer builds.
  const taxAmountsById: TaxAmountsById = useMemo(() => {
    const out: TaxAmountsById = {};
    for (const tax of taxes) {
      const id = tax.specialFields?.taxAmountId;
      const unit = tax.specialFields?.taxAmount;
      if (id !== undefined && unit !== undefined) out[id] = unit;
    }
    return out;
  }, [taxes]);

  return useMemo(() => {
    if (!(price > 0)) {
      return { amounts: null, discount: null, error: null };
    }

    let discount: ProductLineAmounts["discount"] = null;
    let error: DiscountValidationError | null = null;
    try {
      discount = DiscountCalculationService.calculate(price, discountEntries);
    } catch (err) {
      if (!(err instanceof DiscountValidationError)) throw err;
      error = err;
    }

    const amounts = TaxCalculationService.getLineAmounts({
      subtotal: discount?.subtotalAfterDiscount ?? price,
      base_amount: baseAmountOverride,
      monto_total_original: price,
      taxes: taxEntries,
      tax_types: taxTypes.map((tt) => ({
        code: tt.code ?? "",
        tax_id: Number(tt.id),
        description: tt.description ?? "",
      })),
      detail_quantity: 1,
      cabys,
      tax_amounts: taxAmountsById,
      has_factory_tax: hasFactoryTax,
      iva_collected_factory: hasFactoryTax
        ? IvaCollectedFactory.PRE_DETERMINED
        : undefined,
      hasRoyaltyOrBonus: discount?.hasRoyaltyOrBonus,
      customer_pays_tax_on_original_base: discount?.customer_pays_tax_on_original_base,
      discountedNatures: discount?.discountedNatures,
    });

    return { amounts, discount, error };
  }, [
    price,
    discountEntries,
    taxEntries,
    taxTypes,
    cabys,
    taxAmountsById,
    hasFactoryTax,
    baseAmountOverride,
  ]);
}
