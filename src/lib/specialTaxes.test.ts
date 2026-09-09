/**
 * Bracket and CABYS selection for the specific excises.
 *
 * The catalog rows below are verbatim from the data-api seed
 * (`be/data-be/scripts/catalogs_seed_data.json`, `taxAmounts.byTaxCode`),
 * because the whole point of parsing bounds out of the description is that it
 * has to work on the exact strings Hacienda ships.
 */
import { describe, it, expect } from "vitest";
import {
  alcoholAmountFor,
  parseAlcoholBracket,
  isebecAmountFor,
  isToiletSoap,
  isPackagedBeverage,
  CabysPrefix,
} from "./specialTaxes";

const ALCOHOL = [
  { id: 1, description: "Hasta 15% alcohol", amount: 3.66 },
  { id: 2, description: "Más de 15% y hasta 30% alcohol", amount: 4.36 },
  { id: 3, description: "Más de 30% alcohol", amount: 5.1 },
];

const ISEBEC = [
  { id: 10, description: "Bebidas gaseosas y concentrados de gaseosas", amount: 21.79 },
  { id: 11, description: "Otras bebidas líquidas envasadas (incluso agua)", amount: 16.17 },
  { id: 12, description: "Agua (envases de 18 litros o más)", amount: 7.53 },
  { id: 13, description: "Jabón de tocador (por gramo)", amount: 0.276 },
];

describe("Alcohol brackets are read from the catalog description", () => {
  it("parses the three shapes Hacienda uses", () => {
    expect(parseAlcoholBracket("Hasta 15% alcohol")).toEqual({ min: 0, max: 15 });
    expect(parseAlcoholBracket("Más de 15% y hasta 30% alcohol")).toEqual({ min: 15, max: 30 });
    expect(parseAlcoholBracket("Más de 30% alcohol")).toEqual({ min: 30, max: Infinity });
  });

  it("ignores rows that carry no alcohol range", () => {
    expect(parseAlcoholBracket("Jabón de tocador (por gramo)")).toBeNull();
    expect(parseAlcoholBracket("Gasolina regular")).toBeNull();
    expect(parseAlcoholBracket(null)).toBeNull();
  });
});

describe("alcoholAmountFor picks the bracket for a degree", () => {
  it.each([
    [4.5, 3.66],   // beer
    [12, 3.66],    // wine
    [15, 3.66],    // boundary belongs to "hasta 15"
    [15.1, 4.36],
    [30, 4.36],    // boundary belongs to "hasta 30"
    [30.1, 5.1],
    [40, 5.1],     // spirits
  ])("%s%% alcohol resolves to %s", (pct, amount) => {
    expect(alcoholAmountFor(pct as number, ALCOHOL)?.amount).toBe(amount);
  });

  it("returns null rather than guessing when the degree is absent or invalid", () => {
    expect(alcoholAmountFor(null, ALCOHOL)).toBeNull();
    expect(alcoholAmountFor(undefined, ALCOHOL)).toBeNull();
    expect(alcoholAmountFor(-1, ALCOHOL)).toBeNull();
    expect(alcoholAmountFor(NaN, ALCOHOL)).toBeNull();
  });

  it("0% still matches the lowest bracket rather than falling through", () => {
    expect(alcoholAmountFor(0, ALCOHOL)?.amount).toBe(3.66);
  });
});

describe("CABYS decides which ISEBEC amount applies", () => {
  it("toilet soap is priced per gram", () => {
    // 3532101010199 "Jabón de tocador n.c.p."
    expect(isebecAmountFor("3532101010199", ISEBEC)?.amount).toBe(0.276);
    expect(isebecAmountFor("3532101010101", ISEBEC)?.amount).toBe(0.276);
  });

  it("LAUNDRY soap is not toilet soap, and must not match", () => {
    // 3532101010200 "Jabón para lavar" — same family, outside the excise. A
    // short "3532" prefix would have swept it in.
    expect(isToiletSoap("3532101010200")).toBe(false);
    expect(isebecAmountFor("3532101010200", ISEBEC)).toBeNull();
  });

  it("packaged sugary beverages take the gaseosas amount", () => {
    expect(isebecAmountFor("2449001000000", ISEBEC)?.amount).toBe(21.79);
  });

  it("the old Harmonized-System prefixes match nothing — they are not CABYS", () => {
    // "2202" and "3401" were the previous constants. No CABYS code begins with
    // either, which is why every rule keyed on them was dead code.
    expect(isToiletSoap("3401000000000")).toBe(false);
    expect(isPackagedBeverage("2202000000000")).toBe(false);
  });

  it("an unrelated CABYS leaves the choice to the operator", () => {
    expect(isebecAmountFor("7159900009900", ISEBEC)).toBeNull();
    expect(isebecAmountFor(null, ISEBEC)).toBeNull();
  });

  it("prefixes are the narrow, evidence-backed ones", () => {
    expect(CabysPrefix.TOILET_SOAP).toBe("35321010101");
    expect(CabysPrefix.PACKAGED_BEVERAGE).toBe("2449");
  });
});

/**
 * The alcohol proportion, and the two ways it goes wrong.
 *
 * Proporcion = volume(L) x degree, and the v4.4 XSD caps it at 5 decimal
 * places (TotalDigits=10, FractionDigits=5). Both failure modes only appear
 * on realistic inputs:
 *
 *   * a 355 ml can at 4.5% gives 0.015975 — SIX decimals. A round figure like
 *     1 L at 40% gives 0.40000, which is canonically 0.4 and passes, so the
 *     bug hides until someone bills an actual beer.
 *   * a small enough volume x degree rounds to zero, and Hacienda rejects a
 *     zero proportion with -470.
 */
import { isebaProportion, isebaAmount, isebaVolume } from "./specialTaxes";

describe("ISEBA proportion respects the XSD's 5 decimal places", () => {
  it.each([
    [355, 4.5, 0.0162],   // 0.355 L is not expressible -> 0.36
    [473, 5, 0.0235],     // 0.473 L -> 0.47
    [750, 12.5, 0.09375],
    [700, 30.1, 0.2107],
    [1000, 40, 0.4],
  ])("%s ml at %s%% -> %s", (ml, pct, expected) => {
    expect(isebaProportion(ml / 1000, pct as number)).toBeCloseTo(expected as number, 5);
  });

  it("never emits more than 5 decimal places", () => {
    for (const ml of [355, 473, 592, 750, 946]) {
      for (const pct of [4.5, 5, 12.5, 15.1, 30.1, 40]) {
        const p = isebaProportion(ml / 1000, pct);
        const decimals = (String(p).split(".")[1] ?? "").length;
        expect(decimals).toBeLessThanOrEqual(5);
      }
    }
  });

  it("rounds to zero below the precision floor — the -470 case", () => {
    expect(isebaProportion(0.0005, 0.1)).toBe(0);
    expect(isebaProportion(0.005, 0.5)).toBeGreaterThan(0);
  });

  it("computes the amount from the ROUNDED figures, not the raw ones", () => {
    // Hacienda recomputes from the quantity and proportion the document
    // declares, so both have to be the rounded ones or they disagree.
    expect(isebaAmount(1, 0.355, 4.5, 3.66)).toBeCloseTo(0.05929, 5);
    expect(isebaAmount(12, 0.355, 4.5, 3.66)).toBeCloseTo(0.7115, 5);
  });

  it("caps the volume at 2 decimals — the millilitre trap", () => {
    // Sizes that divide cleanly into litres pass untouched; the common can and
    // bottle sizes do not and must be rounded to the centilitre.
    expect(isebaVolume(0.355)).toBe(0.36);
    expect(isebaVolume(0.473)).toBe(0.47);
    expect(isebaVolume(0.75)).toBe(0.75);
    expect(isebaVolume(1)).toBe(1);
    for (const ml of [355, 473, 592, 750, 946, 1000]) {
      const decimals = (String(isebaVolume(ml / 1000)).split(".")[1] ?? "").length;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});

/**
 * ISEBEC (05) — soap and beverages share the code, not the formula.
 *
 * Per the v4.4 spec the beverage case is
 *   Monto = Cantidad × CantidadUnidadMedida × (ImpuestoUnidad / VolumenUnidadConsumo)
 * while toilet soap is charged per GRAM, with no volume in it at all.
 */
import { isebecAmount } from "./specialTaxes";

const SOAP = "35321010101" + "99";      // Jabón de tocador n.c.p.
const LAUNDRY = "3532101010200";        // Jabón para lavar — NOT de tocador
const SODA = "2449001000000";           // Bebidas gaseosas azucaradas

describe("ISEBEC picks its formula from the CABYS", () => {
  it("toilet soap: Cantidad x VolumenUnidadConsumo x ImpuestoUnidad", () => {
    // The volume field carries the GRAMS — 100 g at 0.276 per gram.
    expect(
      isebecAmount({ cabys: SOAP, detailQuantity: 1, quantity: 0, volumeConsumption: 100, taxUnitAmount: 0.276 })
    ).toBeCloseTo(27.6, 5);
  });

  it("soap MULTIPLIES by the volume where a beverage DIVIDES by it", () => {
    // The easiest thing to get backwards. Doubling the grams doubles the tax;
    // doubling a beverage's consumption volume halves it.
    expect(
      isebecAmount({ cabys: SOAP, detailQuantity: 1, quantity: 0, volumeConsumption: 200, taxUnitAmount: 0.276 })
    ).toBeCloseTo(55.2, 5);
    expect(
      isebecAmount({ cabys: SODA, detailQuantity: 1, quantity: 2, volumeConsumption: 2, taxUnitAmount: 21.79 })
    ).toBeCloseTo(21.79, 5);
  });

  it("soap ignores CantidadUnidadMedida entirely", () => {
    const a = isebecAmount({ cabys: SOAP, detailQuantity: 1, quantity: 0, volumeConsumption: 100, taxUnitAmount: 0.276 });
    const b = isebecAmount({ cabys: SOAP, detailQuantity: 1, quantity: 999, volumeConsumption: 100, taxUnitAmount: 0.276 });
    expect(a).toBe(b);
  });

  it("beverages: quantity x (unit / consumption volume)", () => {
    // 2 L declared, consumption unit 0.355 L, 21.79 per unit.
    // 0.355 is not expressible — the volume carries the same 2-decimal cap as
    // the quantity — so it rounds to 0.36 and the tax follows.
    expect(
      isebecAmount({ cabys: SODA, detailQuantity: 1, quantity: 2, volumeConsumption: 0.355, taxUnitAmount: 21.79 })
    ).toBeCloseTo(121.05556, 4);
  });

  it("the line quantity multiplies through", () => {
    expect(
      isebecAmount({ cabys: SODA, detailQuantity: 6, quantity: 1, volumeConsumption: 1, taxUnitAmount: 21.79 })
    ).toBeCloseTo(130.74, 5);
  });

  it("LAUNDRY soap takes the normal formula, not the per-gram one", () => {
    // Same family, outside "de tocador" — it must not get the soap branch.
    expect(
      isebecAmount({ cabys: LAUNDRY, detailQuantity: 1, quantity: 100, volumeConsumption: 1, taxUnitAmount: 0.276 })
    ).toBeCloseTo(27.6, 5);
    expect(
      isebecAmount({ cabys: LAUNDRY, detailQuantity: 1, quantity: 100, volumeConsumption: 2, taxUnitAmount: 0.276 })
    ).toBeCloseTo(13.8, 5); // divided by 2 — proof it took the volume branch
  });

  it("contributes nothing until a consumption volume is supplied", () => {
    // Incomplete, not free — dividing by zero would send the tax to infinity.
    expect(
      isebecAmount({ cabys: SODA, detailQuantity: 1, quantity: 2, volumeConsumption: 0, taxUnitAmount: 21.79 })
    ).toBe(0);
  });
});
