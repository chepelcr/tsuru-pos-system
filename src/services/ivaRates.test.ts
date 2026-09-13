/**
 * IVA rates (Hacienda `TarifaIVA`, Nota 11) — every code the enum defines.
 *
 * Two separate things can go wrong with a rate and only one of them is
 * arithmetic:
 *
 *  1. The tax service must charge `base × rate`, and must charge NOTHING for
 *     the four 0% codes — which are not one case but four legally distinct
 *     ones (exempt with full credit, transitional, exempt under Ley 9635, and
 *     not-subject). They agree on the amount and on nothing else.
 *  2. The rate CODE sent to Hacienda must match the percentage charged. This
 *     is the dangerous one: a line taxed at 13% but filed under code `04`
 *     computes correctly and still misdeclares. `ivaRateCodeFor` is the only
 *     place that derivation happens, because the product catalog stores a
 *     percentage with a null code.
 */
import { describe, it, expect } from "vitest";
import { TaxCalculationService } from "./taxCalculationService";
import { ivaRateCodeFor } from "@/services/ivaRateCode";
import { TaxTypeCode, TaxRateCode, DiscountTypeCode } from "@/lib/enums";
import { DiscountCalculationService } from "./discountCalculationService";

const BASE = 1000;
const TAX_TYPES = [{ code: TaxTypeCode.IVA, tax_id: 1, description: "IVA" }];

/**
 * Verbatim from the data-api catalog that actually serves these rates:
 * `be/data-be/scripts/catalogs_seed_data.json` → `catalogs.taxRates`,
 * countryCode "188". Checked against it 2026-09-08 — all 11 codes and every
 * percentage agree. Kept as a literal (rather than imported) so a reseed that
 * changes a percentage fails HERE, loudly, instead of silently changing what
 * the POS charges.
 *
 * [label, rate code, catalog percentage, expected tax on 1000]
 */
const RATES: ReadonlyArray<[string, string, number, number]> = [
  ["01 exento crédito pleno", TaxRateCode.EXEMPT_FULL_CREDIT, 0, 0],
  ["02 reducida 1%", TaxRateCode.REDUCED_1, 1, 10],
  ["03 reducida 2%", TaxRateCode.REDUCED_2, 2, 20],
  ["04 reducida 4%", TaxRateCode.REDUCED_4, 4, 40],
  ["05 transitoria 0%", TaxRateCode.TRANSITIONAL_0, 0, 0],
  ["06 transitoria 4%", TaxRateCode.TRANSITIONAL_4, 4, 40],
  ["07 transitoria 8%", TaxRateCode.TRANSITIONAL_8, 8, 80],
  ["08 general 13%", TaxRateCode.GENERAL_13, 13, 130],
  ["09 reducida 0.5%", TaxRateCode.REDUCED_HALF, 0.5, 5],
  ["10 exento Ley 9635", TaxRateCode.EXEMPT, 0, 0],
  ["11 no sujeto", TaxRateCode.NOT_SUBJECT, 0, 0],
];

function amountsFor(rate_code: string, rate: number, discounts: any[] = []) {
  const disc = DiscountCalculationService.calculate(BASE, discounts);
  return TaxCalculationService.getLineAmounts({
    subtotal: disc.subtotalAfterDiscount,
    monto_total_original: BASE,
    taxes: [{ code: TaxTypeCode.IVA, rate_code, rate }],
    tax_types: TAX_TYPES,
    detail_quantity: 1,
    hasRoyaltyOrBonus: disc.hasRoyaltyOrBonus,
    customer_pays_tax_on_original_base: disc.customer_pays_tax_on_original_base,
    discountedNatures: disc.discountedNatures,
  });
}

describe("IVA rates — tax charged on a 1000 line", () => {
  it.each(RATES)("%s", (_label, code, rate, expectedTax) => {
    const r = amountsFor(code, rate);
    expect(r.net_tax).toBeCloseTo(expectedTax, 4);
    expect(r.iva_tax_total).toBeCloseTo(expectedTax, 4);
    expect(r.total_amount_line).toBeCloseTo(BASE + expectedTax, 4);
    expect(r.factory_assumed_tax).toBe(0);
  });

  it("covers every rate code the enum defines", () => {
    expect(RATES.map(([, c]) => c).sort()).toEqual(
      Object.values(TaxRateCode).slice().sort()
    );
  });

  it("charges nothing for all four legally distinct 0% codes", () => {
    for (const code of [
      TaxRateCode.EXEMPT_FULL_CREDIT,
      TaxRateCode.TRANSITIONAL_0,
      TaxRateCode.EXEMPT,
      TaxRateCode.NOT_SUBJECT,
    ]) {
      expect(amountsFor(code, 0).net_tax).toBe(0);
    }
  });
});

describe("ivaRateCodeFor — percentage to the code filed with Hacienda", () => {
  it.each([
    [0.5, TaxRateCode.REDUCED_HALF],
    [1, TaxRateCode.REDUCED_1],
    [2, TaxRateCode.REDUCED_2],
    [4, TaxRateCode.REDUCED_4],
    [13, TaxRateCode.GENERAL_13],
  ])("%s%% resolves to code %s", (pct, code) => {
    expect(ivaRateCodeFor(pct as number)).toBe(code);
  });

  it("refuses to guess at 0% — four codes share it and they are not equivalent", () => {
    expect(ivaRateCodeFor(0)).toBeUndefined();
  });

  it("returns undefined for an unknown or absent rate rather than a default", () => {
    expect(ivaRateCodeFor(undefined)).toBeUndefined();
    expect(ivaRateCodeFor(7)).toBeUndefined(); // not a Costa Rica IVA rate at all
  });

  /**
   * Codes 05, 06 and 07 are TRANSITIONAL. The v4.4 rate table (Nota 8.1) marks
   * 05 and 06 "Exclusive use NC/ND" and 07 "Disabled / NC/ND only", so none of
   * them may appear on an invoice or ticket — only on a credit note (03) or
   * debit note (02). sales-be enforces this in `TaxValidator`.
   *
   * That is what makes this map's job simple: on the documents the POS emits,
   * the transitional codes do not exist, so 8% has no valid code at all and 4%
   * has exactly one (`04`) rather than two. Neither omission is a tie-break.
   */
  it("does not resolve 8% — code 07 is transitional, NC/ND-only and disabled", () => {
    expect(ivaRateCodeFor(8)).toBeUndefined();
  });

  it("resolves 4% to the ordinary reduced rate — the transitional 06 is NC/ND-only", () => {
    expect(ivaRateCodeFor(4)).toBe(TaxRateCode.REDUCED_4);
    expect(ivaRateCodeFor(4)).not.toBe(TaxRateCode.TRANSITIONAL_4);
  });

  it("never resolves a percentage to a transitional code", () => {
    const transitional: string[] = [
      TaxRateCode.TRANSITIONAL_0,
      TaxRateCode.TRANSITIONAL_4,
      TaxRateCode.TRANSITIONAL_8,
    ];
    for (const [, , pct] of RATES) {
      const resolved = ivaRateCodeFor(pct);
      if (resolved !== undefined) expect(transitional).not.toContain(resolved);
    }
  });

  /**
   * The real risk is a rate the catalog serves that the map cannot name: the
   * line then goes out with no `rate_code` and sales-api rejects it. Every
   * non-zero catalog percentage must either resolve, or be one of the two
   * documented refusals above.
   */
  it("resolves every non-zero catalog rate except the two documented refusals", () => {
    const unresolved = RATES.filter(
      ([, , pct]) => pct > 0 && ivaRateCodeFor(pct) === undefined
    ).map(([, code, pct]) => `${code}@${pct}%`);
    // Only the transitional 8% — and it is unreachable on a POS document.
    expect(unresolved).toEqual(["07@8%"]);
  });

  it("maps every rate it claims to, and never invents a code", () => {
    const produced = [0.5, 1, 2, 4, 13].map((p) => ivaRateCodeFor(p));
    expect(new Set(produced).size).toBe(produced.length); // no collisions
    for (const c of produced) {
      expect(Object.values(TaxRateCode)).toContain(c);
    }
  });
});

describe("Note 20 holds at every rate, not just 13%", () => {
  it.each(RATES)("%s: royalty routes the whole tax to the issuer", (_l, code, rate, expectedTax) => {
    const r = amountsFor(code, rate, [
      { discount_type: DiscountTypeCode.ROYALTY, percentage: 10 },
    ]);
    // Base does not erode: the assumed tax is still computed on the full 1000.
    expect(r.factory_assumed_tax).toBeCloseTo(expectedTax, 4);
    expect(r.net_tax).toBe(0);
    expect(r.total_amount_line).toBeCloseTo(900, 4);
  });

  it.each(RATES)("%s: code 02 charges the customer, on the DISCOUNTED base", (_l, code, rate) => {
    // Nature 02 leaves the tax with the customer but does NOT preserve the
    // base: Hacienda ties ImpuestoNeto to BaseImponible x tarifa (-45) and
    // BaseImponible to Subtotal (-454), so the tax follows the 900 subtotal,
    // not the 1000 gross. Verified live at 3% and 100%.
    const r = amountsFor(code, rate, [
      { discount_type: DiscountTypeCode.ROYALTY_BONUS_VAT_CUSTOMER, percentage: 10 },
    ]);
    const onDiscounted = 900 * (rate / 100);
    expect(r.factory_assumed_tax).toBe(0);
    expect(r.net_tax).toBeCloseTo(onDiscounted, 4);
    expect(r.total_amount_line).toBeCloseTo(900 + onDiscounted, 4);
  });
});
