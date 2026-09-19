import { describe, expect, it } from "vitest";
import { formatAmount, formatMoney, moneyInputValue, roundMoney, sumMoney } from "./money";

describe("roundMoney", () => {
  it("keeps two decimals", () => {
    expect(roundMoney(4903.63104)).toBe(4903.63);
    expect(roundMoney(1492.452)).toBe(1492.45);
    expect(roundMoney(0)).toBe(0);
  });

  it("rounds a midpoint UP, the way the backend does", () => {
    // ROUND_HALF_UP on the Python side. Plain Math.round disagrees on values
    // whose binary representation falls just under the midpoint, and a
    // one-céntimo disagreement is a total the two sides cannot reconcile.
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(0.125)).toBe(0.13);
  });

  it("treats absent and non-finite values as zero", () => {
    expect(roundMoney(null)).toBe(0);
    expect(roundMoney(undefined)).toBe(0);
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
  });

  it("rounds negatives away from zero at the midpoint", () => {
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(-4903.63104)).toBe(-4903.63);
  });
});

describe("sumMoney", () => {
  it("adds the ROUNDED parts, not the raw ones", () => {
    // The point of the whole module: 0.005 x 4 is 0.02 as raw arithmetic and
    // 0.04 as four rounded céntimos. What the user sees is four lines of 0.01,
    // so the total has to be 0.04 or the order visibly fails to add up.
    expect(sumMoney([0.005, 0.005, 0.005, 0.005])).toBe(0.04);
  });

  it("does not accumulate binary-float noise", () => {
    // 0.1 + 0.2 is 0.30000000000000004 in raw floats.
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney(Array(10).fill(0.1))).toBe(1);
  });

  it("skips absent values", () => {
    expect(sumMoney([1.5, null, undefined, 2.25])).toBe(3.75);
  });

  it("is empty-safe", () => {
    expect(sumMoney([])).toBe(0);
  });
});

describe("formatMoney — two decimals, everywhere", () => {
  // The group separator is es-CR's own (a space, not a period), so it is not
  // asserted literally — that is ICU's business and varies by runtime. What
  // this file pins is the part the app decides: the symbol and exactly two
  // decimals, with the comma es-CR uses for them.
  const decimals = (s: string) => s.slice(s.lastIndexOf(","));

  it("always shows exactly two decimals", () => {
    // The old helpers used `Math.round`, i.e. ZERO decimals, so ₡4 333,50 was
    // displayed as ₡4 334 and a total could visibly fail to equal its parts.
    expect(decimals(formatMoney(4333))).toBe(",00");
    expect(decimals(formatMoney(4333.5))).toBe(",50");
    expect(formatMoney(0)).toBe("₡0,00");
  });

  it("truncates beyond two, rather than printing document precision", () => {
    // A few helpers set `minimumFractionDigits: 2` with no maximum, so a
    // five-decimal value from the document side printed all five.
    expect(decimals(formatMoney(4333.12345))).toBe(",12");
    // …and nothing beyond them: exactly two digits after the comma.
    expect(decimals(formatMoney(4333.12345))).toHaveLength(3);
  });

  it("defaults to the colón and accepts another currency's symbol", () => {
    expect(formatMoney(10)).toBe("₡10,00");
    expect(formatMoney(10, "$")).toBe("$10,00");
    expect(formatMoney(10, "€")).toBe("€10,00");
  });

  it("treats null, undefined and non-finite as zero", () => {
    expect(formatMoney(null)).toBe("₡0,00");
    expect(formatMoney(undefined)).toBe("₡0,00");
    expect(formatMoney(Number.NaN)).toBe("₡0,00");
  });

  it("formatAmount is the same without a symbol", () => {
    expect(formatAmount(4333.5)).toBe(formatMoney(4333.5).replace("₡", ""));
    expect(formatAmount(4333.5).startsWith("₡")).toBe(false);
    expect(decimals(formatAmount(4333.5))).toBe(",50");
  });
});

describe("moneyInputValue — what goes IN a money field", () => {
  it("strips the float noise an exact payment used to show", () => {
    // `String(79696.64000000001)` is what "Exacto" wrote into the cash field:
    // the raw remainder of subtracting the other payments from the total.
    expect(moneyInputValue(79696.64000000001)).toBe("79696.64");
  });

  it("is ungrouped, because a grouped string is not a valid number input", () => {
    expect(moneyInputValue(1234567.5)).toBe("1234567.50");
    expect(moneyInputValue(1234567.5)).not.toContain(",");
  });

  it("always carries two decimals", () => {
    expect(moneyInputValue(100)).toBe("100.00");
  });

  it("is zero, not blank, for nothing", () => {
    // `roundMoney` maps nullish to 0, so the field shows a real amount rather
    // than an empty box the user might read as "not yet set".
    expect(moneyInputValue(null)).toBe("0.00");
    expect(moneyInputValue(undefined)).toBe("0.00");
  });

  it("rounds half-up like the backend", () => {
    expect(moneyInputValue(1.005)).toBe("1.01");
  });
});

describe("negative zero", () => {
  it("never renders as -0,00", () => {
    // Reached wherever a value is negated for display: the IVA report shows
    // credits as deductions, so an all-zero period printed "₡-0,00" five times.
    expect(formatMoney(-0)).toBe("₡0,00");
    expect(formatMoney(-0 as number)).not.toContain("-");
    expect(formatAmount(-0)).toBe("0,00");
  });

  it("still renders real negatives", () => {
    expect(formatMoney(-1234.5)).toContain("-");
    expect(formatMoney(-0.004)).toBe("₡-0,00");
  });
});
