import { describe, expect, it } from "vitest";
import { CABYS_CODE_LENGTH, isValidCabysCode, normalizeCabysCode } from "./cabys";

describe("CABYS code entry", () => {
  it("keeps only digits", () => {
    expect(normalizeCabysCode("01 61 01.01-50000")).toBe("0161010150000");
  });

  it("truncates past the catalog's code length", () => {
    expect(normalizeCabysCode("12345678901234567")).toHaveLength(CABYS_CODE_LENGTH);
  });

  it("accepts exactly thirteen digits and nothing else", () => {
    expect(isValidCabysCode("0161010150000")).toBe(true);
    expect(isValidCabysCode("016101015000")).toBe(false); // 12
    expect(isValidCabysCode("01610101500000")).toBe(false); // 14
    expect(isValidCabysCode("016101015000a")).toBe(false);
    expect(isValidCabysCode("")).toBe(false);
  });

  it("normalizes a pasted code into a valid one", () => {
    expect(isValidCabysCode(normalizeCabysCode("0161-0101-50000"))).toBe(true);
  });
});
