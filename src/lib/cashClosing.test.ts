import { describe, expect, it } from "vitest";
import { closingRows, declaredByCode, sumRows } from "./cashClosing";

describe("closingRows", () => {
  it("always lists the drawer and keeps an undeclared method as a shortfall", () => {
    const rows = closingRows({ "01": 35000, "02": 8000 }, { "01": 34500 });
    expect(rows).toEqual([
      { code: "01", expected: 35000, declared: 34500, difference: -500 },
      { code: "02", expected: 8000, declared: 0, difference: -8000 },
    ]);
    expect(sumRows(rows, "difference")).toBe(-8500);
  });

  it("lists a declared method nothing was expected for, in till order", () => {
    const rows = closingRows({}, { "99": 1000, "06": 200 });
    expect(rows.map((r) => r.code)).toEqual(["01", "06", "99"]);
  });
});

describe("declaredByCode", () => {
  it("sends the counted drawer plus typed non-cash amounts, skipping blanks", () => {
    expect(declaredByCode(20000.004, { "06": "4200", "02": "", "04": "abc", "01": "999" })).toEqual({
      "01": 20000,
      "06": 4200,
    });
  });
});
