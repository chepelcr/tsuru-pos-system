/**
 * The product form ↔ product API mapping, in one place for both directions.
 *
 * This was written twice — once in `ProductsPage` (the list drawer) and once in
 * `ProductDetailPage` — and the two had drifted badly. The detail page's copy
 * dropped **six** fields the list page sends:
 *
 *   * `tax_rate.code` — the Hacienda Nota 8.1 rate code, and it only emitted
 *     `tax_rate` at all when the catalog `id` happened to be set. A CABYS-derived
 *     entry has a code and often no id, so saving such a product from the detail
 *     page stored a tax with **no rate at all**.
 *   * `unit_measure` / `commercial_unit_measure` / `customs_part` / `base_amount`
 *   * `special_fields.proportion` — the absolute-alcohol proportion ISEBA needs
 *     (Nota 8), without which Hacienda answers -470.
 *
 * That made editing a product from its detail page a data-loss operation, and it
 * is the upstream cause of orders that cannot be billed: an imported order line
 * copies the product's taxes verbatim, so a product with a null rate code yields
 * a line sales-api rejects with `tax.rate_code is required when tax.code='01'`.
 *
 * The percentage alone cannot stand in for the code: exento (10), no sujeto (11)
 * and crédito pleno (01) are all "0%", so a document that infers the code back
 * from the rate can declare the wrong tax treatment. Both halves travel.
 */
import type { ProductFormState } from "@/components/products/ProductDrawerForm";
import { DEFAULT_UNIT_MEASURE } from "@/types/productForm";

function trimmed(value: string | undefined | null): string | undefined {
  const out = (value ?? "").trim();
  return out || undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Build the request body for a product create or update.
 *
 * `imageUrl` is passed separately because the MediaPicker has already uploaded
 * to the org bucket by this point; an empty string clears the image, which is
 * why it maps to `null` rather than being omitted.
 */
export function productSavePayload(
  form: ProductFormState,
  opts: { unitsPerBox?: string; imageUrl?: string } = {}
): Record<string, unknown> {
  const { unitsPerBox, imageUrl } = opts;

  return {
    // ── Basic fields ────────────────────────────────────────────────────────
    name: form.name.trim(),
    description: trimmed(form.description),
    price: Number(form.price),
    category_id: form.category_id || undefined,
    track_inventory: form.track_inventory,
    low_stock_threshold:
      form.track_inventory && form.low_stock_threshold
        ? Number(form.low_stock_threshold)
        : undefined,

    // ── Packaging ───────────────────────────────────────────────────────────
    units_per_box: unitsPerBox ? Number(unitsPerBox) : undefined,

    // ── CABYS — a UUID referencing an existing data-services cabys row ───────
    cabys_id: form.cabysId || undefined,

    // ── The rest of the document line ───────────────────────────────────────
    // A product is the template a `LineaDetalle` is built from. Hacienda
    // requires `UnidadMedida` on every line, so a product without one forces the
    // checkout to fall back to "Unid" whatever the article is really sold by.
    unit_measure: form.unitMeasure || DEFAULT_UNIT_MEASURE,
    commercial_unit_measure: trimmed(form.commercialUnitMeasure),
    customs_part: trimmed(form.customsPart),
    base_amount: numberOrUndefined(form.baseAmount),

    // Catalog-level exoneración (Nota 10.1). `exemption_amount` is NOT sent: it
    // is `MontoExonerado`, derived as tax × rate / 100 against the line being
    // billed, and a figure computed against one unit would pin a multi-unit
    // line's exonerated amount to one unit's.
    exemption_authorization_code: trimmed(form.exemptionAuthorizationCode),
    exempted_rate: numberOrUndefined(form.exemptedRate),

    // Factory-tax charge id (data-services numeric id). The BE persists the
    // canonical IVA-collected-at-factory linkage on the product.
    factory_tax_charge_id: form.factoryTaxChargeId || undefined,

    // ── Product codes — Hacienda code strings (01/02/03/04/99) ───────────────
    codes:
      form.codes.length > 0
        ? form.codes.map((c) => ({ code_type_id: c.codeTypeCode, number: c.value }))
        : undefined,

    // ── Taxes ───────────────────────────────────────────────────────────────
    taxes:
      form.taxes.length > 0
        ? form.taxes.map((t) => ({
            tax_type_id: t.taxCode,
            // `id` carries the Hacienda rate CODE, not a data-services row id.
            // The code is what identifies the treatment and what the document
            // carries; the row id is environment-specific and a reseed can
            // renumber it. store-be's own legacy normalizer already reads
            // `tax_rate.id` as the rate code, so this makes both writers agree.
            tax_rate: t.taxRateCode
              ? {
                  id: t.taxRateCode,
                  percentage: t.rate,
                  code: t.taxRateCode,
                }
              : undefined,
            tax_factor: t.taxFactorId
              ? { id: String(t.taxFactorId), factor: t.taxFactor ?? 0 }
              : undefined,
            special_fields: t.specialFields
              ? {
                  quantity: t.specialFields.quantity,
                  percentage: t.specialFields.percentage,
                  // Nota 8: proporción de alcohol absoluto = cantidad × grado.
                  // Hacienda answers -470 when code 04 arrives without it.
                  proportion: t.specialFields.proportion,
                  tax_amount: t.specialFields.taxAmountId
                    ? {
                        id: String(t.specialFields.taxAmountId),
                        amount: t.specialFields.taxAmount ?? 0,
                      }
                    : undefined,
                  volume_consumption: t.specialFields.volumeConsumption,
                }
              : undefined,
          }))
        : undefined,

    // ── Discounts ───────────────────────────────────────────────────────────
    // `reason` is the canonical Nota-20 descriptor: auto-filled for the known
    // codes (01/02/03), required free text for 99.
    discounts:
      form.discounts.length > 0
        ? form.discounts.map((d) => ({
            discount_type_id: d.discountCode,
            percentage: d.rate,
            reason: trimmed(d.reason),
          }))
        : undefined,

    // Empty string clears the image, so this is null rather than omitted.
    image_url: imageUrl || null,
  };
}

/**
 * Populate the form from a loaded product — the inbound half of the same
 * mapping, and previously the other place the two pages had diverged: the
 * detail page's copy dropped `special_fields.proportion` on READ, so even a
 * correct save path could not round-trip the absolute-alcohol proportion.
 *
 * `unitMeasure` is never left blank. An empty unit is not a legal document
 * line, and a product that predates the column still has to open with one.
 */
export function productFormFromProduct(p: any): ProductFormState {
  const hasCabys = !!p.cabys?.id;
  const hasTaxes = (p.taxes ?? []).length > 0;

  return {
    name: p.name,
    description: p.description ?? "",
    price: String(p.price),
    category_id: p.category_id ?? "",
    track_inventory: p.track_inventory ?? false,
    has_fiscal_info: hasCabys || hasTaxes,
    has_package_info: !!(p.units_per_box && p.units_per_box > 0),
    low_stock_threshold: p.low_stock_threshold ? String(p.low_stock_threshold) : "",
    cabysId: p.cabys?.id ?? "",
    cabys: p.cabys?.code ?? "",
    cabysDescription: p.cabys?.description ?? "",
    unitMeasure: p.unit_measure || DEFAULT_UNIT_MEASURE,
    commercialUnitMeasure: p.commercial_unit_measure ?? "",
    customsPart: p.customs_part ?? "",
    baseAmount:
      p.base_amount !== null && p.base_amount !== undefined ? String(p.base_amount) : "",
    exemptionAuthorizationCode: p.exemption_authorization_code ?? "",
    exemptedRate:
      p.exempted_rate !== null && p.exempted_rate !== undefined ? String(p.exempted_rate) : "",
    exemptionNumber: "",
    productTypeId: p.cabys?.product_type_id ?? undefined,
    factoryTaxChargeId: p.factory_tax_charge_id ?? undefined,
    hasFactoryTax: !!p.factory_tax || !!p.factory_tax_charge_id,
    // The BE returns Hacienda code strings in the *_type_id fields. Form
    // entries carry the code; numeric data-services catalog ids are looked up
    // by the section components when they need them.
    codes: (p.codes ?? []).map((c: any) => ({
      codeTypeCode: String(c.code_type_id ?? ""),
      value: c.number,
    })),
    taxes: (p.taxes ?? []).map((t: any) => ({
      taxCode: String(t.tax_type_id ?? ""),
      rate: t.tax_rate?.percentage ?? t.rate ?? 0,
      // `id` is read as a fallback because it carries the same code, and rows
      // written before that was true hold a data-services row id there — which
      // is not a rate code, so it is only trusted when `code` is absent AND it
      // looks like one (two digits).
      taxRateCode:
        t.tax_rate?.code ??
        t.rate_code ??
        (/^\d{2}$/.test(String(t.tax_rate?.id ?? "")) ? String(t.tax_rate.id) : undefined),
      taxFactorId: t.tax_factor?.id,
      taxFactor: t.tax_factor?.factor,
      specialFields: t.special_fields
        ? {
            quantity: t.special_fields.quantity,
            percentage: t.special_fields.percentage,
            proportion: t.special_fields.proportion,
            volumeConsumption: t.special_fields.volume_consumption,
            taxAmountId: t.special_fields.tax_amount?.id,
            taxAmount: t.special_fields.tax_amount?.amount,
          }
        : undefined,
    })),
    discounts: (p.discounts ?? []).map((d: any, i: number) => ({
      id: `edit-${d.discount_type_id}-${i}`,
      discountCode: String(d.discount_type_id ?? ""),
      rate: d.percentage ?? d.rate,
      reason: d.reason,
    })),
  } as ProductFormState;
}
