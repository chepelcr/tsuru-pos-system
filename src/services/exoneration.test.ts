/**
 * The exoneration math, pinned against sales-be.
 *
 * Expectations are the BACKEND's, written longhand from `ExonerationService`:
 *
 *     MontoExonerado = MontoImpuesto × (TarifaExonerada / 100)
 *     impuesto_neto  = Σ (MontoImpuesto − MontoExonerado)
 *
 * with `percentage` validated into [0, 100] and the exonerated amount capped at
 * the tax it exonerates (`HACIENDA_EXONERATION_AMOUNT_OVER_TAX`).
 *
 * The numbers use the same net 4333 / 13% basis as sales-be's live fixtures, so
 * both sides can be compared against one signed XML.
 */
import { describe, expect, it } from "vitest";
import { TaxCalculationService, exoneratedAmount } from "./taxCalculationService";
import { TaxTypeCode, TaxRateCode, ExemptionCode } from "@/lib/enums";
import type { LineTax } from "@/types/lineDetail";

const IVA_13: LineTax = {
  code: TaxTypeCode.IVA,
  rate_code: TaxRateCode.GENERAL_13,
  rate: 13,
};

const TAX_TYPES = [
  { id: 1, code: TaxTypeCode.IVA, description: "IVA" },
  { id: 4, code: TaxTypeCode.ISEBA, description: "ISEBA" },
] as never[];

function amountsFor(taxes: LineTax[], subtotal = 4333) {
  return TaxCalculationService.getLineAmounts({
    subtotal,
    taxes,
    tax_types: TAX_TYPES,
    detail_quantity: 1,
    tax_amounts: {},
    hasRoyaltyOrBonus: false,
    discountedNatures: [],
  } as never);
}

describe("exoneratedAmount — MontoExonerado", () => {
  it("is tax × percentage / 100", () => {
    expect(exoneratedAmount({ type: "08", percentage: 100 }, 563.29)).toBeCloseTo(563.29, 5);
    expect(exoneratedAmount({ type: "08", percentage: 50 }, 563.29)).toBeCloseTo(281.645, 5);
    expect(exoneratedAmount({ type: "08", percentage: 13 }, 100)).toBeCloseTo(13, 5);
  });

  it("is zero with no exemption, no percentage, or a zero percentage", () => {
    expect(exoneratedAmount(undefined, 563.29)).toBe(0);
    expect(exoneratedAmount({ type: "08" }, 563.29)).toBe(0);
    expect(exoneratedAmount({ type: "08", percentage: 0 }, 563.29)).toBe(0);
  });

  it("never exceeds the tax it exonerates", () => {
    // The backend rejects this outright; the FE must not show a negative tax
    // while the operator is still typing.
    expect(exoneratedAmount({ type: "08", percentage: 150 }, 100)).toBe(100);
  });

  it("ignores a negative percentage", () => {
    expect(exoneratedAmount({ type: "08", percentage: -10 }, 100)).toBe(0);
  });

  it("does NOT trust an inbound `amount`", () => {
    // `MontoExonerado` is an output. A client naming its own exonerated figure
    // is how VAT gets under-declared.
    expect(exoneratedAmount({ type: "08", percentage: 10, amount: 999 }, 100)).toBeCloseTo(10, 5);
  });
});

describe("a fully exonerated IVA line", () => {
  it("charges the customer no tax, and totals to the net", () => {
    const plain = amountsFor([IVA_13]);
    expect(plain.net_tax).toBeCloseTo(563.29, 2);
    expect(plain.total_amount_line).toBeCloseTo(4896.29, 2);

    const exonerated = amountsFor([
      { ...IVA_13, exemption: { type: ExemptionCode.FREE_TRADE_ZONE, number: "AL-1", percentage: 100 } },
    ]);
    expect(exonerated.net_tax).toBeCloseTo(0, 2);
    expect(exonerated.total_amount_line).toBeCloseTo(4333, 2);
    expect(exonerated.exonerated_total).toBeCloseTo(563.29, 2);
  });

  it("reports a partial exoneration proportionally", () => {
    const half = amountsFor([
      { ...IVA_13, exemption: { type: ExemptionCode.FREE_TRADE_ZONE, number: "AL-1", percentage: 50 } },
    ]);
    expect(half.net_tax).toBeCloseTo(281.65, 2);
    expect(half.exonerated_total).toBeCloseTo(281.65, 2);
    expect(half.total_amount_line).toBeCloseTo(4333 + 281.65, 2);
  });

  it("leaves the taxable base at its full amount", () => {
    // BaseImponible is Subtotal plus the base-building excises at their FULL
    // amount (Hacienda -454). The exoneration applies to the tax, not the base.
    const exonerated = amountsFor([
      { ...IVA_13, exemption: { type: ExemptionCode.FREE_TRADE_ZONE, number: "AL-1", percentage: 100 } },
    ]);
    expect(exonerated.base_amount).toBeCloseTo(4333, 2);
  });

  it("does not exonerate an IVA the ISSUER is already absorbing", () => {
    // With a royalty the issuer absorbs the whole IVA, so the customer never
    // paid it and there is nothing to forgive. Exonerating it too would
    // double-count the same tax.
    const result = TaxCalculationService.getLineAmounts({
      subtotal: 4333,
      monto_total_original: 4333,
      taxes: [
        { ...IVA_13, exemption: { type: ExemptionCode.FREE_TRADE_ZONE, number: "AL-1", percentage: 100 } },
      ],
      tax_types: TAX_TYPES,
      detail_quantity: 1,
      tax_amounts: {},
      hasRoyaltyOrBonus: true,
      discountedNatures: ["01"],
    } as never);
    expect(result.factory_assumed_tax).toBeCloseTo(563.29, 2);
    expect(result.net_tax).toBeCloseTo(0, 2);
    expect(result.exonerated_total).toBeCloseTo(0, 2);
  });
});

describe("a line with no exoneration is unchanged", () => {
  it("reports exonerated_total 0", () => {
    expect(amountsFor([IVA_13]).exonerated_total).toBe(0);
  });
});
