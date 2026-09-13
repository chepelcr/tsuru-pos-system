/**
 * The product form ↔ API round trip.
 *
 * These exist because the two product pages each carried their own copy of this
 * mapping and the copies diverged — the detail page's dropped the Hacienda rate
 * code, the unit of measure, the customs part, the editable base and the alcohol
 * proportion. A product saved from that page became unbillable, because an
 * imported order line copies the product's taxes verbatim and sales-api rejects
 * an IVA line with no `rate_code`.
 *
 * The round-trip assertions are the point: whatever the API returns must survive
 * load → save unchanged.
 */
import { describe, expect, it } from "vitest";
import { productFormFromProduct, productSavePayload } from "./productFormMapping";

/** A product configured the way the fiscal form allows — every field populated. */
const FULLY_CONFIGURED = {
  name: "Cerveza artesanal 355ml",
  description: "Lata",
  price: 1500,
  category_id: "cat-1",
  track_inventory: true,
  low_stock_threshold: 6,
  units_per_box: 24,
  cabys: { id: "cabys-uuid", code: "3401000000000", description: "Cerveza", product_type_id: 4 },
  unit_measure: "Sp",
  commercial_unit_measure: "Lata",
  customs_part: "2203.00.00",
  base_amount: 5000,
  factory_tax_charge_id: 1,
  codes: [{ code_type_id: "04", number: "INT-1" }],
  taxes: [
    {
      tax_type_id: "04",
      tax_rate: { id: "08", percentage: 13, code: "08" },
      tax_factor: { id: "01", factor: 0.058 },
      special_fields: {
        quantity: 0.355,
        percentage: 4.5,
        proportion: 0.01598,
        volume_consumption: 0.355,
        tax_amount: { id: "14", amount: 3.66 },
      },
    },
  ],
  discounts: [{ discount_type_id: "99", percentage: 3, reason: "Acuerdo comercial" }],
  image_url: "https://example.test/a.png",
};

describe("productFormFromProduct", () => {
  it("reads the alcohol proportion, which one copy used to drop", () => {
    const form = productFormFromProduct(FULLY_CONFIGURED);
    expect(form.taxes[0].specialFields?.proportion).toBe(0.01598);
  });

  it("reads the Hacienda rate code", () => {
    const form = productFormFromProduct(FULLY_CONFIGURED);
    expect(form.taxes[0].taxRateCode).toBe("08");
  });

  it("falls back to `tax_rate.id` only when it looks like a rate code", () => {
    // Rows written before `id` carried the code hold a data-services row id
    // there. "8" is not a Nota 8.1 code (they are two digits), so it must not
    // be mistaken for one; "08" is.
    const fromId = productFormFromProduct({
      ...FULLY_CONFIGURED,
      taxes: [{ tax_type_id: "01", tax_rate: { id: "08", percentage: 13 } }],
    });
    expect(fromId.taxes[0].taxRateCode).toBe("08");

    const fromRowId = productFormFromProduct({
      ...FULLY_CONFIGURED,
      taxes: [{ tax_type_id: "01", tax_rate: { id: "8", percentage: 13 } }],
    });
    expect(fromRowId.taxes[0].taxRateCode).toBeUndefined();
  });

  it("never opens with a blank unit of measure", () => {
    // An empty UnidadMedida is not a legal document line, and products predating
    // the column still have to open with something.
    const form = productFormFromProduct({ ...FULLY_CONFIGURED, unit_measure: null });
    expect(form.unitMeasure).toBe("Unid");
  });

  it("tolerates the flat tax spelling the API has also emitted", () => {
    const form = productFormFromProduct({
      ...FULLY_CONFIGURED,
      taxes: [{ tax_type_id: "01", rate: 13, rate_code: "08" }],
    });
    expect(form.taxes[0].rate).toBe(13);
    expect(form.taxes[0].taxRateCode).toBe("08");
  });
});

describe("productSavePayload", () => {
  it("sends the rate code, not only the percentage", () => {
    // The percentage alone does not identify the treatment: exento (10), no
    // sujeto (11) and crédito pleno (01) are all 0%.
    const body = productSavePayload(productFormFromProduct(FULLY_CONFIGURED));
    expect((body.taxes as any[])[0].tax_rate).toMatchObject({
      id: "08",
      percentage: 13,
      code: "08",
    });
  });

  it("puts the rate CODE in `id`, not a data-services row id", () => {
    // The row id is environment-specific — a reseed renumbers it — while the
    // code is the Hacienda identifier the document actually carries.
    const body = productSavePayload(productFormFromProduct(FULLY_CONFIGURED));
    expect((body.taxes as any[])[0].tax_rate.id).toBe("08");
  });

  it("omits tax_rate entirely when there is no code", () => {
    // Better no rate block than one identified by a number that means nothing
    // to Hacienda.
    const form = productFormFromProduct(FULLY_CONFIGURED);
    form.taxes[0].taxRateCode = undefined;
    const body = productSavePayload(form);
    expect((body.taxes as any[])[0].tax_rate).toBeUndefined();
  });

  it("sends the alcohol proportion (Hacienda answers -470 without it)", () => {
    const body = productSavePayload(productFormFromProduct(FULLY_CONFIGURED));
    expect((body.taxes as any[])[0].special_fields.proportion).toBe(0.01598);
  });

  it("sends the rest of the document line", () => {
    const body = productSavePayload(productFormFromProduct(FULLY_CONFIGURED), {
      unitsPerBox: "24",
    });
    expect(body).toMatchObject({
      unit_measure: "Sp",
      commercial_unit_measure: "Lata",
      customs_part: "2203.00.00",
      base_amount: 5000,
      factory_tax_charge_id: 1,
      cabys_id: "cabys-uuid",
      units_per_box: 24,
    });
  });

  it("round-trips every fiscal field the API returned", () => {
    const body = productSavePayload(productFormFromProduct(FULLY_CONFIGURED), {
      unitsPerBox: "24",
      imageUrl: FULLY_CONFIGURED.image_url,
    });
    expect(body.taxes).toEqual(FULLY_CONFIGURED.taxes);
    expect(body.codes).toEqual(FULLY_CONFIGURED.codes);
    expect(body.discounts).toEqual(FULLY_CONFIGURED.discounts);
  });

  it("maps an empty image to null so it clears, rather than omitting it", () => {
    const body = productSavePayload(productFormFromProduct(FULLY_CONFIGURED), { imageUrl: "" });
    expect(body.image_url).toBeNull();
  });

  it("omits the optional blocks entirely when the form has none", () => {
    const form = productFormFromProduct({
      ...FULLY_CONFIGURED,
      codes: [],
      taxes: [],
      discounts: [],
    });
    const body = productSavePayload(form);
    expect(body.taxes).toBeUndefined();
    expect(body.codes).toBeUndefined();
    expect(body.discounts).toBeUndefined();
  });
});
