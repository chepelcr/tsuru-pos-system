import { describe, expect, it } from "vitest";
import { TaxTypeCode } from "@/lib/enums";
import type { CabysItem } from "@/services/data-api";
import type { DiscountFormEntry, TaxFormEntry } from "@/types/productForm";
import {
  applyCabysIva,
  discountEntriesToLine,
  lineDiscountsToEntries,
  lineTaxesToTaxEntries,
  taxEntriesToLineTaxes,
} from "./fiscalForm";

/**
 * The product drawer edits its taxes and discounts through the sections it
 * shares with the POS line-detail drawer, by converting to the line shape and
 * back on every change. A field lost on that round trip is silently dropped
 * from the product the next time anything in the section is touched.
 */

const ISEBA: TaxFormEntry = {
  taxCode: TaxTypeCode.ISEBA,
  rate: 0,
  specialFields: {
    quantity: 0.35,
    percentage: 4.5,
    proportion: 0.01575,
    taxAmountId: 7,
    taxAmount: 23.5,
    volumeConsumption: 350,
  },
};
const IVARBU: TaxFormEntry = { taxCode: TaxTypeCode.IVARBU, rate: 0, taxFactor: 0.5, taxFactorId: 3 };
const IVA: TaxFormEntry = { taxCode: TaxTypeCode.IVA, rate: 13, taxRateCode: "08" };

describe("tax entries ↔ line taxes", () => {
  it("round-trips every field, special fields included", () => {
    const back = lineTaxesToTaxEntries(taxEntriesToLineTaxes([IVA, ISEBA, IVARBU]), [
      { id: 3, factor: 0.5 },
    ]);
    expect(back).toEqual([IVA, ISEBA, IVARBU]);
  });

  it("resolves the IVARBU factor id from the factor picked", () => {
    const [tax] = taxEntriesToLineTaxes([IVARBU]);
    const [back] = lineTaxesToTaxEntries([{ ...tax, factor: 0.7 }], [
      { id: 3, factor: 0.5 },
      { id: 4, factor: 0.7 },
    ]);
    expect(back.taxFactorId).toBe(4);
  });

  it("does not invent special fields for a tax that has none", () => {
    const [back] = lineTaxesToTaxEntries([{ code: TaxTypeCode.IVA, rate: 13, special_fields: {} }]);
    expect(back.specialFields).toBeUndefined();
  });
});

describe("discount entries ↔ line discounts", () => {
  const entries: DiscountFormEntry[] = [
    { id: "a", discountCode: "01", rate: 10, reason: "Regalía" },
    { id: "b", discountCode: "99", rate: undefined, reason: "" },
  ];

  it("round-trips and keeps each row's key", () => {
    expect(lineDiscountsToEntries(discountEntriesToLine(entries), entries)).toEqual(entries);
  });

  it("gives an added row a new key", () => {
    const added = [...discountEntriesToLine(entries), { discount_type: "02", percentage: 5, reason: "x" }];
    const back = lineDiscountsToEntries(added, entries);
    expect(back[2].id).toBeTruthy();
    expect(back[2].id).not.toBe("a");
  });
});

describe("applyCabysIva", () => {
  const rates = [
    { id: 1, code: "01", percentage: 0 },
    { id: 10, code: "10", percentage: 0 },
    { id: 8, code: "08", percentage: 13 },
  ];
  const cabys = (tax_rate: Partial<CabysItem["tax_rate"]> | null): CabysItem =>
    ({ id: "c", code: "8313100009900", description: "x", categories: [], status: null, product_type: null, tax_rate }) as CabysItem;

  it("adds an 01 IVA with the CABYS rate code when there is none", () => {
    expect(applyCabysIva([], cabys({ id: 8, code: "08", percentage: 13 }), rates)).toEqual([
      { code: TaxTypeCode.IVA, rate: 13, rate_code: "08", special_fields: {} },
    ]);
  });

  it("applies a 0% suggestion by its code, not the first 0% rate", () => {
    const [iva] = applyCabysIva([], cabys({ id: 10, code: "10", percentage: 0 }), rates);
    expect(iva.rate_code).toBe("10");
  });

  it("keeps an existing IVA-family code and only updates its rate", () => {
    const taxes = [{ code: TaxTypeCode.IVACE, rate: 4, rate_code: "04" }];
    expect(applyCabysIva(taxes, cabys({ id: 8, code: "08", percentage: 13 }), rates)).toEqual([
      { code: TaxTypeCode.IVACE, rate: 13, rate_code: "08" },
    ]);
  });
});
