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
