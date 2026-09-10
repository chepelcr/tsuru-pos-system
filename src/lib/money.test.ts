import { describe, expect, it } from "vitest";
import { roundMoney, sumMoney } from "./money";

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
