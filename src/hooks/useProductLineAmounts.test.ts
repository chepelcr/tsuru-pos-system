import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProductLineAmounts } from "./useProductLineAmounts";
import { DiscountTypeCode, TaxRateCode, TaxTypeCode } from "@/lib/enums";
import type { DiscountFormEntry, TaxFormEntry } from "@/types/productForm";

const TAX_TYPES = [
  { code: TaxTypeCode.IVA, id: 1, description: "IVA" },
  { code: TaxTypeCode.ISC, id: 2, description: "Selectivo de consumo" },
];

const iva13: TaxFormEntry = {
  taxCode: TaxTypeCode.IVA,
  rate: 13,
  taxRateCode: TaxRateCode.GENERAL_13,
};

function run(args: {
  price: number;
  taxes?: TaxFormEntry[];
  discounts?: DiscountFormEntry[];
  hasFactoryTax?: boolean;
}) {
  const { result } = renderHook(() =>
    useProductLineAmounts({
      price: args.price,
      taxes: args.taxes ?? [iva13],
      discounts: args.discounts ?? [],
      taxTypes: TAX_TYPES,
      hasFactoryTax: args.hasFactoryTax,
    }),
  );
  return result.current;
}

describe("useProductLineAmounts", () => {
  it("prices a plain product at 13%", () => {
    const { amounts } = run({ price: 1000 });
    expect(amounts?.net_tax).toBeCloseTo(130, 5);
    expect(amounts?.base_amount).toBeCloseTo(1000, 5);
  });

  it("taxes the DISCOUNTED base, not the list price", () => {
    // The bug this replaced: the form passed `subtotal: price` — the
    // pre-discount amount — so a discounted product previewed its IVA on the
    // wrong base while the panel beside it showed the right one.
    const { amounts } = run({
      price: 1000,
      discounts: [{ id: "d1", discountCode: DiscountTypeCode.COMMERCIAL, rate: 10 }],
    });
    expect(amounts?.net_tax).toBeCloseTo(117, 5);
  });

  it("cascades multiple discounts against the running balance", () => {
    // 1000 -> 900 -> 855, not 850.
    const { discount } = run({
      price: 1000,
      discounts: [
        { id: "d1", discountCode: DiscountTypeCode.COMMERCIAL, rate: 10 },
        { id: "d2", discountCode: DiscountTypeCode.VOLUME, rate: 5 },
      ],
    });
    expect(discount?.subtotalAfterDiscount).toBeCloseTo(855, 5);
    expect(discount?.perDiscount[0].amount).toBeCloseTo(100, 5);
    expect(discount?.perDiscount[1].amount).toBeCloseTo(45, 5);
  });

  it("routes a royalty's IVA to the issuer", () => {
    // Nature 01 leaves the VAT base un-eroded and moves the tax into
    // ImpuestoAsumidoEmisorFabrica. The old call passed the raw discount list
    // to the tax service, which ignores it for routing by design — so this
    // never happened on the product screen at all.
    const { amounts } = run({
      price: 1000,
      discounts: [{ id: "d1", discountCode: DiscountTypeCode.ROYALTY, rate: 100 }],
    });
    expect(amounts?.factory_assumed_tax).toBeCloseTo(130, 5);
    expect(amounts?.net_tax).toBeCloseTo(0, 5);
  });

  it("builds the IVA base from a base-building excise", () => {
    // ISC (02) is added to the base before IVA: (1000 + 100) x 13%.
    const { amounts } = run({
      price: 1000,
      taxes: [{ taxCode: TaxTypeCode.ISC, rate: 10 }, iva13],
    });
    expect(amounts?.base_amount).toBeCloseTo(1100, 5);
    expect(amounts?.iva_tax_total).toBeCloseTo(143, 5);
  });

  it("absorbs the IVA when the factory collected it", () => {
    const { amounts } = run({ price: 1000, hasFactoryTax: true });
    expect(amounts?.net_tax).toBeCloseTo(0, 5);
    expect(amounts?.factory_assumed_tax).toBeCloseTo(130, 5);
  });

  it("surfaces the nature-99 reason requirement instead of computing", () => {
    // Nota 20 requires free text for "Otros"; the cascade rejects the line and
    // the form blocks save on it.
    const { error } = run({
      price: 1000,
      discounts: [{ id: "d1", discountCode: DiscountTypeCode.OTHER, rate: 10 }],
    });
    expect(error).not.toBeNull();
  });

  it("computes nothing without a price", () => {
    expect(run({ price: 0 }).amounts).toBeNull();
  });
});
