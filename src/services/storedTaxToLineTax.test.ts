/**
 * The stored-tax → document-tax contract.
 *
 * Expectations here are the BACKEND's, written longhand from the v4.4 analysis
 * doc and sales-be's validators — not copied from what this implementation
 * returns. The four rules under test are each a document Hacienda would
 * otherwise reject or, worse, accept while it says something untrue:
 *
 *   * `tax.rate_code is required when tax.code='01'` (tax_validator.py)
 *   * `tax.factor is required when tax.code=08` (tax_validator.py)
 *   * the excises price off a per-unit amount, which the stored shape nests
 *   * an unresolvable row must be dropped, never defaulted to IVA
 */
import { describe, expect, it } from "vitest";
import {
  lineTaxFromStored,
  lineTaxesFromStored,
  specialFieldsToDocument,
} from "./storedTaxToLineTax";

describe("rate_code — derived when the stored row has none", () => {
  it("prefers the stored code over the derivation", () => {
    const tax = lineTaxFromStored({
      tax_type_id: "01",
      tax_rate: { percentage: 13, code: "08" },
    });
    expect(tax?.rate_code).toBe("08");
  });

  it("derives it from the percentage when the catalog left it null", () => {
    // This is the reported bug: the product catalog stores a percentage with a
    // null code, the order line inherits it, and sales-api rejects the line.
    const tax = lineTaxFromStored({
      tax_type_id: "01",
      tax_rate: { percentage: 13, code: null },
    });
    expect(tax?.rate_code).toBe("08");
  });

  it.each([
    [0.5, "09"],
    [1, "02"],
    [2, "03"],
    [4, "04"],
    [13, "08"],
  ])("derives %s%% as rate code %s", (percentage, code) => {
    const tax = lineTaxFromStored({ tax_type_id: "01", tax_rate: { percentage } });
    expect(tax?.rate_code).toBe(code);
  });

  it("leaves 0% with NO code — exento/no-sujeto/crédito-pleno are all 0%", () => {
    // Guessing one of 01/10/11 here would put a wrong tax treatment on a legal
    // document. The line must carry an explicitly chosen code instead.
    const tax = lineTaxFromStored({ tax_type_id: "01", tax_rate: { percentage: 0 } });
    expect(tax?.rate_code).toBeUndefined();
  });

  it("derives for the whole IVA family (01, 07, 08), not only 01", () => {
    for (const code of ["01", "07", "08"]) {
      const tax = lineTaxFromStored({ tax_type_id: code, tax_rate: { percentage: 13 } });
      expect(tax?.rate_code).toBe("08");
    }
  });

  it("does not invent a rate code for a non-IVA tax", () => {
    // ISC (02) is rate-driven but carries no CodigoTarifaIVA; the mapper emits
    // `CodigoTarifaIVA` only for the IVA family.
    const tax = lineTaxFromStored({ tax_type_id: "02", tax_rate: { percentage: 13 } });
    expect(tax?.rate_code).toBeUndefined();
  });
});

describe("factor — IVARBU (08) is a factor, not a rate on top of one", () => {
  it("carries the nested stored factor", () => {
    const tax = lineTaxFromStored({
      tax_type_id: "08",
      tax_rate: { percentage: 13, code: "08" },
      tax_factor: { id: "01", factor: 0.058 },
    });
    expect(tax?.factor).toBe(0.058);
  });

  it("accepts the flat spelling too", () => {
    expect(lineTaxFromStored({ tax_type_id: "08", factor: 0.05 })?.factor).toBe(0.05);
  });

  it("omits factor when there is none, rather than sending 0", () => {
    // A literal 0 would price the line at zero tax and look deliberate; absent
    // makes the backend reject it, which is the honest outcome.
    expect(lineTaxFromStored({ tax_type_id: "08" })?.factor).toBeUndefined();
  });
});

describe("special_fields — the nested stored shape flattens for the document", () => {
  it("lifts tax_amount.{id,amount} to tax_amount_id / tax_unit_amount", () => {
    const sf = specialFieldsToDocument({
      quantity: 0.355,
      percentage: 4.5,
      proportion: 0.01598,
      tax_amount: { id: "14", amount: 3.66 },
    });
    expect(sf).toEqual({
      quantity: 0.355,
      percentage: 4.5,
      proportion: 0.01598,
      volume_consumption: undefined,
      tax_amount_id: 14,
      tax_unit_amount: 3.66,
    });
  });

  it("passes the already-flat document spelling through unchanged", () => {
    const sf = specialFieldsToDocument({ quantity: 2, tax_amount_id: 7, tax_unit_amount: 21.79 });
    expect(sf?.tax_amount_id).toBe(7);
    expect(sf?.tax_unit_amount).toBe(21.79);
  });

  it("returns undefined for an empty block rather than {}", () => {
    expect(specialFieldsToDocument({})).toBeUndefined();
    expect(specialFieldsToDocument(null)).toBeUndefined();
  });

  it("flattens through the full row mapper, so an excise keeps its unit amount", () => {
    // ISEBA (04) prices as detail_qty × (quantity × percentage/100) × unitAmount;
    // with no unit amount it computed zero.
    const tax = lineTaxFromStored({
      tax_type_id: "04",
      special_fields: { quantity: 0.355, percentage: 4.5, tax_amount: { id: "14", amount: 3.66 } },
    });
    expect(tax?.special_fields?.tax_unit_amount).toBe(3.66);
    expect(tax?.special_fields?.tax_amount_id).toBe(14);
  });
});

describe("unresolvable rows are dropped, never defaulted", () => {
  it("drops a row with no tax type instead of calling it IVA", () => {
    // Defaulting to "01" turned an excise line into an IVA line — a
    // misdeclaration that Hacienda would accept.
    expect(lineTaxFromStored({ tax_rate: { percentage: 13, code: "08" } })).toBeNull();
    expect(lineTaxFromStored({ tax_type_id: "" })).toBeNull();
    expect(lineTaxFromStored(null)).toBeNull();
  });

  it("keeps the resolvable rows and drops only the bad one", () => {
    const taxes = lineTaxesFromStored([
      { tax_type_id: "01", tax_rate: { percentage: 13 } },
      { tax_rate: { percentage: 2 } },
      { tax_type_id: "02", tax_rate: { percentage: 10 } },
    ]);
    expect(taxes.map((t) => t.code)).toEqual(["01", "02"]);
  });

  it("never forwards a stored amount — the backend recomputes it", () => {
    // The stored figure was computed against the PRODUCT's quantity, so
    // forwarding it creates a number the two sides can disagree about.
    const tax = lineTaxFromStored({ tax_type_id: "01", tax_rate: { percentage: 13 }, amount: 42 });
    expect(tax).not.toHaveProperty("amount");
  });

  it("pads a single-digit code to two digits", () => {
    expect(lineTaxFromStored({ tax_type_id: "1" })?.code).toBe("01");
  });

  it("returns [] for a missing or non-array taxes field", () => {
    expect(lineTaxesFromStored(undefined)).toEqual([]);
    expect(lineTaxesFromStored(null)).toEqual([]);
  });
});
