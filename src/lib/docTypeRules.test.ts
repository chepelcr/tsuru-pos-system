import { describe, expect, it } from "vitest";
import {
  conformTaxesToDocType,
  counterpartyIssues,
  isIdTypeAllowedOn,
  isSaleConditionAllowedOn,
  isServiceLine,
  lineIssues,
} from "./docTypeRules";
import { isRateCodeAllowedFor, DOC_TYPES_REQUIRING_REFERENCE } from "@/lib/enums";

// Expectations come from the 2026-11-07 Hacienda sandbox run (TSR-R03-68) and
// the official v4.4 XSDs — not from what this module returns.

describe("FEC (08)", () => {
  it("requires a reference (XSD minOccurs=1; Hacienda -1 without one)", () => {
    expect(DOC_TYPES_REQUIRING_REFERENCE).toContain("08");
  });

  it("accepts the case Hacienda accepted: supplier 06 with condition 13", () => {
    expect(counterpartyIssues("08", "06", "13")).toEqual([]);
  });

  it("hints (does not block) that a 01-04 supplier must be Inscrito (-37)", () => {
    const issues = counterpartyIssues("08", "01", "01");
    expect(issues).toEqual([{ key: "checkout.rules.fecSupplierMustBeRegistered", level: "hint" }]);
  });

  it("lets a non-domiciled foreigner (05) through without a hint", () => {
    expect(counterpartyIssues("08", "05", "01")).toEqual([]);
  });

  it("blocks condition 13 for a supplier that is not 06", () => {
    expect(counterpartyIssues("08", "02", "13").map((i) => i.key)).toContain(
      "checkout.rules.usedGoodsNeedsNonTaxpayer",
    );
  });
});

describe("counterparty on sales", () => {
  it("rejects 06 No contribuyente outside the FEC", () => {
    for (const doc of ["01", "02", "03", "09"]) {
      expect(isIdTypeAllowedOn("06", doc)).toBe(false);
    }
    expect(isIdTypeAllowedOn("06", "08")).toBe(true);
    expect(isIdTypeAllowedOn("01", "01")).toBe(true);
  });

  it("offers condition 13 only on the FEC and 12 nowhere but FE/NC/ND/TE", () => {
    expect(isSaleConditionAllowedOn("13", "01")).toBe(false);
    expect(isSaleConditionAllowedOn("13", "08")).toBe(true);
    expect(isSaleConditionAllowedOn("12", "08")).toBe(false);
    expect(isSaleConditionAllowedOn("12", "09")).toBe(false);
    expect(isSaleConditionAllowedOn("12", "01")).toBe(true);
    expect(isSaleConditionAllowedOn("01", "09")).toBe(true);
  });
});

describe("FEE (09) lines", () => {
  it("offers only rate 10 (Hacienda -101 on 01)", () => {
    expect(isRateCodeAllowedFor("10", "09")).toBe(true);
    expect(isRateCodeAllowedFor("01", "09")).toBe(false);
    expect(isRateCodeAllowedFor("08", "09")).toBe(false);
    expect(isRateCodeAllowedFor("08", "01")).toBe(true);
  });

  it("files every IVA-family tax as rate 10 at 0%, leaving other taxes alone", () => {
    const out = conformTaxesToDocType(
      [
        { code: "01", rate: 13, rate_code: "08" },
        { code: "08", rate: 13, rate_code: "08", factor: 0.05 },
        { code: "02", rate: 10 },
      ] as any,
      "09",
    );
    expect(out[0]).toMatchObject({ code: "01", rate: 0, rate_code: "10" });
    expect(out[1]).toMatchObject({ code: "01", rate: 0, rate_code: "10", factor: undefined });
    expect(out[2]).toEqual({ code: "02", rate: 10 });
  });

  it("leaves taxes untouched on every other document type", () => {
    const taxes = [{ code: "01", rate: 13, rate_code: "08" }] as any;
    for (const doc of ["01", "02", "03", "04", "08"]) {
      expect(conformTaxesToDocType(taxes, doc)).toBe(taxes);
    }
  });

  it("requires a 12-digit tariff heading on a goods line (-503)", () => {
    expect(lineIssues({ cabys: "0111100000000" }, "09")).toEqual(["checkout.rules.customsPartRequired"]);
    expect(lineIssues({ cabys: "0111100000000", customs_part: "0901" }, "09")).toEqual([
      "checkout.rules.customsPartFormat",
    ]);
    expect(lineIssues({ cabys: "0111100000000", customs_part: "090121100000" }, "09")).toEqual([]);
  });

  it("does not ask a service line for a tariff heading", () => {
    expect(lineIssues({ cabys: "8311100000000" }, "09")).toEqual([]);
    expect(lineIssues({ unit_measure: "Sp" }, "09")).toEqual([]);
  });

  it("flags a taxed rate that reached the export", () => {
    expect(
      lineIssues({ cabys: "8311100000000", taxes: [{ code: "01", rate: 13, rate_code: "08" }] as any }, "09"),
    ).toEqual(["checkout.rules.exportRateExempt"]);
  });

  it("asks nothing of lines on other document types", () => {
    expect(lineIssues({ cabys: "0111100000000" }, "01")).toEqual([]);
  });
});

describe("isServiceLine mirrors sales-be _classify_kind", () => {
  it("reads CABYS first digit, unit only as fallback", () => {
    expect(isServiceLine("5000000000000", "Unid")).toBe(true);
    expect(isServiceLine("4999999999999", "Sp")).toBe(false);
    expect(isServiceLine(undefined, "Os")).toBe(true);
    expect(isServiceLine(undefined, "kg")).toBe(false);
  });
});
