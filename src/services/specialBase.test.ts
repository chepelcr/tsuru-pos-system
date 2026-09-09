/**
 * The editable taxable base, and the used-goods factor.
 *
 * The v4.4 analysis doc allows the base to depart from the derived amount in
 * exactly two situations, and neither is a rate:
 *
 *   1. Tax code 07 (IVA cálculo especial) — "used for presumptive margins.
 *      The taxable base is edited directly and the tax is calculated on it."
 *   2. IVACobradoFabrica code 01 (VAT determined at the factory level) —
 *      "the taxable base is editable in these cases."
 *
 * And separately, tax code 08 (used goods): "the tax results from multiplying
 * the subtotal by the margin factor established by the Ministry" — the factor
 * IS the calculation, so the rate is not applied on top of it. The factor's
 * value comes from the data-api catalog, but only the value travels: it is a
 * ministry-set multiplier, not a Hacienda code.
 *
 * Expectations are the backend's, from sales-be's TaxService on subtotal 1000.
 */
import { describe, it, expect } from "vitest";
import { TaxCalculationService } from "./taxCalculationService";
import { TaxTypeCode, TaxRateCode } from "@/lib/enums";

const SUBTOTAL = 1000;
const TAX_TYPES = [
  { code: TaxTypeCode.IVA, tax_id: 1, description: "IVA" },
  { code: TaxTypeCode.IVACE, tax_id: 7, description: "IVA cálculo especial" },
  { code: TaxTypeCode.IVARBU, tax_id: 8, description: "IVA bienes usados" },
];

function amounts(taxes: any[], base_amount?: number) {
  return TaxCalculationService.getLineAmounts({
    subtotal: SUBTOTAL,
    base_amount,
    monto_total_original: SUBTOTAL,
    taxes,
    tax_types: TAX_TYPES,
    detail_quantity: 1,
  });
}

describe("IVA cálculo especial (07) — the base is edited directly", () => {
  const IVACE = [
    { code: TaxTypeCode.IVACE, rate_code: TaxRateCode.GENERAL_13, rate: 13 },
  ];

  it("taxes the edited base, not the subtotal: 2500 @13% = 325", () => {
    expect(amounts(IVACE, 2500).net_tax).toBeCloseTo(325, 4);
  });

  it("falls back to the derived base when none is given: 1000 @13% = 130", () => {
    expect(amounts(IVACE).net_tax).toBeCloseTo(130, 4);
  });

  it("an edited base BELOW the subtotal still prices off the edited base", () => {
    // The POS blocks this in the UI (Nota 7: the manual base must cover the
    // discounted subtotal) — but the engine itself is not the guard, and
    // pinning that keeps the two responsibilities from blurring.
    expect(amounts(IVACE, 400).net_tax).toBeCloseTo(52, 4);
  });
});

describe("IVA régimen de bienes usados (08) — factor, not rate", () => {
  it("tax = subtotal × factor; the rate is NOT applied on top", () => {
    const r = amounts([
      { code: TaxTypeCode.IVARBU, rate_code: TaxRateCode.GENERAL_13, rate: 13, factor: 0.3 },
    ]);
    expect(r.net_tax).toBeCloseTo(300, 4);
    // The bug this guards: subtotal × factor × rate = 39, not 300.
    expect(r.net_tax).not.toBeCloseTo(39, 2);
  });
});

describe("Plain IVA (01) is unaffected", () => {
  it("prices off the subtotal at the ordinary rate", () => {
    const IVA = [{ code: TaxTypeCode.IVA, rate_code: TaxRateCode.GENERAL_13, rate: 13 }];
    expect(amounts(IVA).net_tax).toBeCloseTo(130, 4);
  });
});
