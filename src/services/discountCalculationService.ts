/**
 * Hacienda discount-cascade calculator.
 *
 * Discounts are applied SEQUENTIALLY to the eroding net price, not summed as
 * a single percentage — this matches the Hacienda v4.4 spec (Nota 20) and is
 * the reason the BE rejects payloads computed by naive `Σ percentage` rules.
 *
 * Routing the factory-assumed-tax decision through this service (instead of
 * the tax service) keeps the tax math pure. The tax service receives the
 * resolved `discountedNatures` / `hasRoyaltyOrBonus` flag and decides which
 * lines flow into `factory_assumed_tax`.
 */
import {
  DiscountTypeCode,
  FACTORY_ASSUMED_DISCOUNT_NATURES,
  type DiscountTypeCodeValue,
} from '@/lib/enums';
import type { LineDiscount } from '@/types/lineDetail';

export type { LineDiscount };

/** Stable error code so callers can branch (toast vs inline) without parsing message text. */
export class DiscountValidationError extends Error {
  code: 'REASON_REQUIRED';
  index: number;
  constructor(message: string, index: number) {
    super(message);
    this.name = 'DiscountValidationError';
    this.code = 'REASON_REQUIRED';
    this.index = index;
  }
}

export interface PerDiscountAmount {
  /** Index in the input array — surfaces back to UI for inline errors. */
  index: number;
  code: DiscountTypeCodeValue;
  amount: number;
}

export interface LineDiscountResult {
  /** net_price after the full sequential cascade. */
  subtotalAfterDiscount: number;
  /** Sum of every discount.amount (always non-negative). */
  totalDiscountAmount: number;
  /** Per-discount amounts in input order, with their resolved Hacienda code. */
  perDiscount: PerDiscountAmount[];
  /** True when any discount belongs to `FACTORY_ASSUMED_DISCOUNT_NATURES` (codes 01/03). */
  hasRoyaltyOrBonus: boolean;
  /**
   * True when any discount has code `02` (Royalty/Bonus, VAT-to-customer).
   * The customer still pays IVA on the original (pre-discount) base, but the
   * tax does NOT route to `factory_assumed_tax` — it stays on `net_tax`.
   */
  customer_pays_tax_on_original_base: boolean;
  /** Unique discount-type codes that triggered factory-assumed routing. */
  discountedNatures: DiscountTypeCodeValue[];
}

export class DiscountCalculationService {
  /**
   * Apply discounts sequentially to `net_price`. The remainder after each
   * step is the base for the next discount — this is the canonical Hacienda
   * cascade.
   *
   * `discount.amount` is preferred when provided (already-resolved monetary
   * amount); otherwise `percentage` is applied to the running remainder.
   */
  static calculate(net_price: number, discounts: LineDiscount[]): LineDiscountResult {
    let remainder = net_price;
    let totalDiscountAmount = 0;
    const perDiscount: PerDiscountAmount[] = [];
    const naturesSet = new Set<DiscountTypeCodeValue>();
    const factorySet = new Set<DiscountTypeCodeValue>();
    let customerPaysTaxOnOriginalBase = false;

    discounts.forEach((d, index) => {
      const code = (d.discount_type ?? '') as DiscountTypeCodeValue;

      if (code === DiscountTypeCode.OTHER) {
        const reason = d.reason;
        if (!reason || !reason.trim()) {
          throw new DiscountValidationError(
            'discount.reason.required',
            index,
          );
        }
      }

      // Hacienda allows either an absolute amount or a percentage of the
      // running remainder. Absolute amount wins when both are present.
      const amount =
        d.amount !== undefined && d.amount !== null
          ? d.amount
          : remainder * ((d.percentage ?? 0) / 100);

      const clamped = Math.max(0, Math.min(amount, remainder));
      remainder -= clamped;
      totalDiscountAmount += clamped;

      perDiscount.push({ index, code, amount: clamped });
      naturesSet.add(code);
      if ((FACTORY_ASSUMED_DISCOUNT_NATURES as readonly string[]).includes(code)) {
        factorySet.add(code);
      }
      if (code === DiscountTypeCode.ROYALTY_BONUS_VAT_CUSTOMER) {
        customerPaysTaxOnOriginalBase = true;
      }
    });

    return {
      subtotalAfterDiscount: remainder,
      totalDiscountAmount,
      perDiscount,
      hasRoyaltyOrBonus: factorySet.size > 0,
      customer_pays_tax_on_original_base: customerPaysTaxOnOriginalBase,
      discountedNatures: Array.from(naturesSet),
    };
  }

  /** Convenience wrapper kept so existing call sites can migrate gradually. */
  static calculateSubtotal(net_price: number, discounts: LineDiscount[]): number {
    return this.calculate(net_price, discounts).subtotalAfterDiscount;
  }

  /** Convenience wrapper for the total discount amount only. */
  static calculateTotalDiscountAmount(
    net_price: number,
    discounts: LineDiscount[],
  ): number {
    return this.calculate(net_price, discounts).totalDiscountAmount;
  }
}
