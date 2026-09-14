import { describe, it, expect } from "vitest";
import {
  lineDiscountFromStored,
  lineDiscountsFromStored,
} from "./storedDiscountToLineDiscount";
import { DiscountTypeCode } from "@/lib/enums";

/**
 * Expectations come from the Hacienda spec and from the API shapes, written
 * longhand — never from what this implementation returns.
 */
describe("lineDiscountFromStored", () => {
  it("reads the rate from `percentage`, which is what the product endpoint sends", () => {
    // The regression: the line drawer read only `rate`, so a product
    // configured at 3.17% opened as 0%.
    const out = lineDiscountFromStored({
      discount_type_id: "07",
      percentage: 3.17,
    });
    expect(out).toEqual({ discount_type: "07", percentage: 3.17 });
  });

  it("reads the rate from `rate` too, which is what order lines send", () => {
    const out = lineDiscountFromStored({ discount_type_id: "07", rate: 5 });
    expect(out?.percentage).toBe(5);
  });

  it("prefers `percentage` when a row carries both", () => {
    const out = lineDiscountFromStored({
      discount_type_id: "07",
      percentage: 3.17,
      rate: 0,
    });
    expect(out?.percentage).toBe(3.17);
  });

  it("does not round the rate — 3.17 is an agreement, not a display", () => {
    expect(lineDiscountFromStored({ discount_type_id: "07", percentage: 3.17 })?.percentage)
      .toBe(3.17);
  });

  it("pads a single-digit nature to two characters", () => {
    expect(lineDiscountFromStored({ discount_type_id: 7 })?.discount_type).toBe("07");
  });

  it("DROPS a row with no nature rather than defaulting it to commercial", () => {
    // Defaulting to 07 would declare the customer paid VAT the issuer absorbed
    // (or the reverse) on a regalía/bonificación line.
    expect(lineDiscountFromStored({ percentage: 10 })).toBeNull();
    expect(lineDiscountFromStored({ discount_type_id: "" })).toBeNull();
    expect(lineDiscountFromStored({ discount_type_id: null })).toBeNull();
  });

  it("keeps the Nota 20 reason, which the backend requires for nature 99", () => {
    const out = lineDiscountFromStored({
      discount_type_id: DiscountTypeCode.OTHER,
      percentage: 2,
      reason: "Acuerdo comercial",
    });
    expect(out).toEqual({
      discount_type: "99",
      percentage: 2,
      reason: "Acuerdo comercial",
    });
  });

  it("keeps an absolute amount when that is how the discount was captured", () => {
    const out = lineDiscountFromStored({ discount_type_id: "07", amount: 1500 });
    expect(out).toEqual({ discount_type: "07", amount: 1500 });
  });

  it("omits the rate entirely when there is none, rather than sending 0%", () => {
    // A 0% discount and no discount are different statements.
    const out = lineDiscountFromStored({ discount_type_id: "07" });
    expect(out).toEqual({ discount_type: "07" });
    expect("percentage" in out!).toBe(false);
  });

  it("returns null for a non-object row", () => {
    expect(lineDiscountFromStored(null)).toBeNull();
    expect(lineDiscountFromStored("07")).toBeNull();
  });
});

describe("lineDiscountsFromStored", () => {
  it("drops only the unresolvable rows and keeps the rest", () => {
    const out = lineDiscountsFromStored([
      { discount_type_id: "01", percentage: 5 },
      { percentage: 99 },
      { discount_type_id: "07", percentage: 3.17 },
    ]);
    expect(out).toEqual([
      { discount_type: "01", percentage: 5 },
      { discount_type: "07", percentage: 3.17 },
    ]);
  });

  it("returns an empty array for a missing or non-array value", () => {
    expect(lineDiscountsFromStored(undefined)).toEqual([]);
    expect(lineDiscountsFromStored({})).toEqual([]);
  });

  it("covers every Nota 20 nature, so a new one cannot go untested", () => {
    const natures = Object.values(DiscountTypeCode);
    const out = lineDiscountsFromStored(
      natures.map((n) => ({ discount_type_id: n, percentage: 1 })),
    );
    expect(out.map((d) => d.discount_type)).toEqual([...natures]);
  });
});
