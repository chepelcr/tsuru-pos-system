/**
 * Note 20 (discount natures) — FE must produce the SAME line numbers as
 * sales-be's `_compute_lines`, because the cart shows one and the document
 * carries the other. The expectations below are not derived from this
 * implementation; they are the backend's rule written out longhand:
 *
 *   base_not_eroded = nature ∈ {01, 02, 03}  → VAT base stays the GROSS amount
 *   issuer_assumes  = nature ∈ {01, 03}      → that VAT leaves net_tax and
 *                                              lands in factory_assumed_tax
 *   monto_total_linea = subtotal_after_discount + impuesto_neto
 *
 * Fixture: gross 1000, one 10% discount, IVA 13%.
 */
import { describe, it, expect } from "vitest";
import {
  DiscountCalculationService,
  DiscountValidationError,
} from "./discountCalculationService";
import { TaxCalculationService } from "./taxCalculationService";
import { TaxTypeCode, TaxRateCode, DiscountTypeCode } from "@/lib/enums";

const GROSS = 1000;
const IVA = [{ code: TaxTypeCode.IVA, rate_code: TaxRateCode.GENERAL_13, rate: 13 }];
const TAX_TYPES = [{ code: TaxTypeCode.IVA, tax_id: 1, description: "IVA" }];

function line(nature: string) {
  const disc = DiscountCalculationService.calculate(GROSS, [
    {
      discount_type: nature,
      percentage: 10,
      // Only nature 99 requires a reason; on the others it is inert.
      ...(nature === DiscountTypeCode.OTHER ? { reason: "Ajuste comercial" } : {}),
    },
  ]);
  const amounts = TaxCalculationService.getLineAmounts({
    subtotal: disc.subtotalAfterDiscount,
    monto_total_original: GROSS,
    taxes: IVA,
    tax_types: TAX_TYPES,
    detail_quantity: 1,
    hasRoyaltyOrBonus: disc.hasRoyaltyOrBonus,
    customer_pays_tax_on_original_base: disc.customer_pays_tax_on_original_base,
    discountedNatures: disc.discountedNatures,
  });
  return { subtotal: disc.subtotalAfterDiscount, ...amounts };
}

/**
 * Every nature Hacienda defines, not just the interesting ones — a code that
 * silently falls into the wrong bucket is exactly the failure this is for.
 * `04`-`09` and `99` are ordinary discounts: the base erodes and nothing is
 * assumed. Only `01`/`03` (issuer assumes) and `02` (customer pays on the
 * gross) depart from that.
 */
const ISSUER_ASSUMES = { net_tax: 0, factory_assumed_tax: 130, total: 900 };
// Nature 02 keeps the tax with the customer but on the DISCOUNTED base, so its
// numbers are an ordinary discount's. Hacienda rejects the alternative: -45
// requires ImpuestoNeto == BaseImponible x tarifa and -454 requires
// BaseImponible == Subtotal, which together make a customer-paid tax on the
// un-eroded base unrepresentable. Verified live at 3% and at 100%.
const ORDINARY = { net_tax: 117, factory_assumed_tax: 0, total: 1017 };

const CASES: ReadonlyArray<[string, string, typeof ORDINARY]> = [
  ["01 Regalía", DiscountTypeCode.ROYALTY, ISSUER_ASSUMES],
  ["02 Regalía/bonif. IVA al cliente", DiscountTypeCode.ROYALTY_BONUS_VAT_CUSTOMER, ORDINARY],
  ["03 Bonificación", DiscountTypeCode.BONUS, ISSUER_ASSUMES],
  ["04 Volumen", DiscountTypeCode.VOLUME, ORDINARY],
  ["05 Temporada", DiscountTypeCode.SEASONAL, ORDINARY],
  ["06 Promocional", DiscountTypeCode.PROMOTIONAL, ORDINARY],
  ["07 Comercial", DiscountTypeCode.COMMERCIAL, ORDINARY],
  ["08 Frecuencia", DiscountTypeCode.FREQUENCY, ORDINARY],
  ["09 Sostenido", DiscountTypeCode.SUSTAINED, ORDINARY],
  ["99 Otros", DiscountTypeCode.OTHER, ORDINARY],
];

describe("Note 20 — every discount nature, FE math matches sales-be", () => {
  it.each(CASES)("%s", (_label, code, expected) => {
    const r = line(code);
    expect(r.subtotal).toBeCloseTo(900, 4);
    expect(r.net_tax).toBeCloseTo(expected.net_tax, 4);
    expect(r.factory_assumed_tax).toBeCloseTo(expected.factory_assumed_tax, 4);
    expect(r.total_amount_line).toBeCloseTo(expected.total, 4);
  });

  it("covers every code the enum defines", () => {
    expect(CASES.map(([, c]) => c).sort()).toEqual(
      Object.values(DiscountTypeCode).slice().sort()
    );
  });
});

describe("Nature 99 requires a reason", () => {
  it("throws when the reason is missing", () => {
    expect(() =>
      DiscountCalculationService.calculate(GROSS, [
        { discount_type: DiscountTypeCode.OTHER, percentage: 10 },
      ])
    ).toThrow(DiscountValidationError);
  });

  it("throws when the reason is only whitespace", () => {
    expect(() =>
      DiscountCalculationService.calculate(GROSS, [
        { discount_type: DiscountTypeCode.OTHER, percentage: 10, reason: "   " },
      ])
    ).toThrow(DiscountValidationError);
  });

  it("reports which discount failed so the UI can mark that row", () => {
    try {
      DiscountCalculationService.calculate(GROSS, [
        { discount_type: DiscountTypeCode.COMMERCIAL, percentage: 5 },
        { discount_type: DiscountTypeCode.OTHER, percentage: 10 },
      ]);
      throw new Error("expected a DiscountValidationError");
    } catch (e) {
      expect(e).toBeInstanceOf(DiscountValidationError);
      expect((e as DiscountValidationError).index).toBe(1);
      expect((e as DiscountValidationError).code).toBe("REASON_REQUIRED");
    }
  });

  it("accepts a reason alone — the XML field is derived backend-side", () => {
    const r = line(DiscountTypeCode.OTHER);
    expect(r.total_amount_line).toBeCloseTo(1017, 4);
  });

  it("does not demand a reason from any other nature", () => {
    for (const code of Object.values(DiscountTypeCode)) {
      if (code === DiscountTypeCode.OTHER) continue;
      expect(() =>
        DiscountCalculationService.calculate(GROSS, [
          { discount_type: code, percentage: 10 },
        ])
      ).not.toThrow();
    }
  });
});

/**
 * Factory-assumed IVA at the general 13% rate, on the same fixture the live
 * backend suite files (`tests/local/suites/assumed_tax_matrix.json`): net 4333,
 * IVA 01/08 at 13%, a 3% discount of nature 01 or 02.
 *
 * These are the exact numbers the signed XML carries, so a divergence here is
 * a divergence from what Hacienda receives — not a rounding opinion.
 */
describe("Factory-assumed IVA at 13% — matches the live document", () => {
  const NET = 4333;
  const IVA_13 = [{ code: TaxTypeCode.IVA, rate_code: TaxRateCode.GENERAL_13, rate: 13 }];

  function fixture(nature: string) {
    const disc = DiscountCalculationService.calculate(NET, [
      { discount_type: nature, percentage: 3 },
    ]);
    const amounts = TaxCalculationService.getLineAmounts({
      subtotal: disc.subtotalAfterDiscount,
      monto_total_original: NET,
      taxes: IVA_13,
      tax_types: TAX_TYPES,
      detail_quantity: 1,
      hasRoyaltyOrBonus: disc.hasRoyaltyOrBonus,
      customer_pays_tax_on_original_base: disc.customer_pays_tax_on_original_base,
      discountedNatures: disc.discountedNatures,
    });
    return { subtotal: disc.subtotalAfterDiscount, ...amounts };
  }

  it("01 Regalía: issuer absorbs 563.29, customer pays the discounted 4203.01", () => {
    const r = fixture(DiscountTypeCode.ROYALTY);
    expect(r.subtotal).toBeCloseTo(4203.01, 4);
    expect(r.net_tax).toBe(0);
    expect(r.factory_assumed_tax).toBeCloseTo(563.29, 4);
    expect(r.total_amount_line).toBeCloseTo(4203.01, 4);
  });

  it("02: customer pays 546.39130 on the discounted base, voucher 4749.40130", () => {
    // The exact figure Hacienda named in -45 when the un-eroded base was used.
    const r = fixture(DiscountTypeCode.ROYALTY_BONUS_VAT_CUSTOMER);
    expect(r.subtotal).toBeCloseTo(4203.01, 4);
    expect(r.factory_assumed_tax).toBe(0);
    expect(r.net_tax).toBeCloseTo(546.3913, 4);
    expect(r.total_amount_line).toBeCloseTo(4749.4013, 4);
  });

  it("the discount does not reduce the tax — both natures tax the full 4333", () => {
    // 13% of the ORIGINAL 4333, not of the discounted 4203.01 (which would be
    // 546.39). This is the whole point of Note 20 and the easiest thing to
    // regress by "simplifying" the base back to the subtotal.
    expect(fixture(DiscountTypeCode.ROYALTY).factory_assumed_tax).toBeCloseTo(4333 * 0.13, 4);
    expect(fixture(DiscountTypeCode.ROYALTY).factory_assumed_tax).not.toBeCloseTo(4203.01 * 0.13, 2);
  });
});
