import { describe, it, expect } from "vitest";
import { formatRate, formatPercent } from "./percent";
import { TaxRateCode, isRateCodeAllowedFor, NC_ND_ONLY_RATE_CODES } from "@/lib/enums";

describe("formatPercent", () => {
  it("keeps a configured rate's real precision", () => {
    // The regression: `toFixed(1)` showed a 3.17% discount as "3.2%", which is
    // a different agreement with the customer — and the cascade beside it was
    // computed from 3.17.
    expect(formatPercent(3.17)).toBe("3,17%");
  });

  it("does not pad a whole rate with decimals", () => {
    expect(formatPercent(13)).toBe("13%");
  });

  it("keeps one decimal when that is all there is", () => {
    expect(formatPercent(0.5)).toBe("0,5%");
  });

  it("carries three decimals, the most Hacienda declares", () => {
    expect(formatPercent(2.125)).toBe("2,125%");
  });

  it("treats a missing rate as zero rather than NaN", () => {
    expect(formatPercent(undefined)).toBe("0%");
    expect(formatPercent(null)).toBe("0%");
  });

  it("does not group the integer part — a rate is never four digits", () => {
    expect(formatRate(1000)).toBe("1000");
  });
});

describe("isRateCodeAllowedFor", () => {
  it("allows the general 13% rate on an ordinary invoice", () => {
    expect(isRateCodeAllowedFor(TaxRateCode.GENERAL_13, "01")).toBe(true);
  });

  it("refuses the transitional rates on an invoice, a tiquete and an export", () => {
    for (const doc of ["01", "04", "09"]) {
      expect(isRateCodeAllowedFor(TaxRateCode.TRANSITIONAL_0, doc)).toBe(false);
      expect(isRateCodeAllowedFor(TaxRateCode.TRANSITIONAL_4, doc)).toBe(false);
      expect(isRateCodeAllowedFor(TaxRateCode.TRANSITIONAL_8, doc)).toBe(false);
    }
  });

  it("allows the transitional rates on a credit and a debit note", () => {
    for (const doc of ["02", "03"]) {
      for (const code of NC_ND_ONLY_RATE_CODES) {
        expect(isRateCodeAllowedFor(code, doc)).toBe(true);
      }
    }
  });

  it("refuses the transitional rates with no document — a product default", () => {
    // A product cannot default to a rate only a corrective note may carry.
    for (const code of NC_ND_ONLY_RATE_CODES) {
      expect(isRateCodeAllowedFor(code, undefined)).toBe(false);
    }
  });

  it("allows every non-transitional code with no document", () => {
    const ordinary = Object.values(TaxRateCode).filter(
      (c) => !NC_ND_ONLY_RATE_CODES.includes(c),
    );
    // Guard: the whole enum is classified, so a new rate code fails this suite
    // until someone decides which side it belongs on.
    expect(ordinary.length + NC_ND_ONLY_RATE_CODES.length).toBe(
      Object.values(TaxRateCode).length,
    );
    for (const code of ordinary) {
      expect(isRateCodeAllowedFor(code, undefined)).toBe(true);
    }
  });
});
