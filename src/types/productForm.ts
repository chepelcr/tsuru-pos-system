/**
 * Hacienda-code-only entry shapes.
 *
 * The BE keys taxes/discounts/codes by their Hacienda code STRING (e.g. "01" IVA,
 * "99" Otros) — see `app/utils/product_calculations.py` and the `TaxType` /
 * `DiscountType` / `ProductCodeType` enums in cross-app-be. The numeric DB ids
 * from data-services are not part of that contract and were a source of
 * round-trip bugs (sending DB id "17" as discount_type_id, etc.), so the form
 * stores only the canonical code.
 *
 * The remaining numeric ids on these entries (taxFactorId, taxAmountId) are
 * intentionally kept — they reference data-services catalog rows that have no
 * Hacienda equivalent (a factor is a ministry multiplier, an amount is a
 * catalog figure), and the BE accepts them as opaque string references on
 * `tax_factor.id` / `tax_amount.id`.
 *
 * A tax RATE is not one of those. It has a Hacienda equivalent — the Nota 8.1
 * rate code — so `tax_rate.id` carries that CODE rather than a data-services
 * row id, and there is no separate `taxRateId`. The row id is
 * environment-specific and a reseed can renumber it, which is the same class of
 * round-trip bug as sending DB id "17" as a discount_type_id.
 */

export interface TaxFormEntry {
  /** Hacienda tax type code: "01" IVA, "02" ISC, "07" IVACE, "08" IVARBU, "99" OTROS, etc. */
  taxCode: string;
  rate: number;
  /**
   * Hacienda Nota 8.1 rate code ("08" general 13%, "10" exenta, ...).
   *
   * Persisted alongside the percentage rather than inferred from it. The
   * mapping is one-way at 0%: exento (10), no sujeto (11) and crédito pleno
   * (01) are all "0%", so a document built by guessing the code back from the
   * percentage can carry the wrong tax treatment.
   */
  taxRateCode?: string;
  /** data-services tax-factor catalog id (opaque). */
  taxFactorId?: number;
  /** IVARBU factor value (e.g. 0.13). Captured at select time so the BE receives the real number. */
  taxFactor?: number;
  specialFields?: {
    quantity?: number;
    percentage?: number;
    /**
     * Proporción de alcohol absoluto = cantidad × grado (Nota 8).
     *
     * Derived from the other two rather than typed, and stored so the value the
     * document declares is the one the amount was computed from.
     */
    proportion?: number;
    /** data-services tax-amount catalog id (opaque). */
    taxAmountId?: number;
    /** Unit amount from the tax-amounts catalog. Captured at select time so the BE receives the real number. */
    taxAmount?: number;
    volumeConsumption?: number;
  };
}

export interface DiscountFormEntry {
  /** Stable client-side key (Hacienda allows multiple discounts of the same type). */
  id: string;
  /** Hacienda discount type code: "01" TRADE, "02" VOLUME, "03" PROMOTIONAL, "99" OTROS. */
  discountCode: string;
  rate?: number;
  /**
   * Canonical Hacienda Nota-20 free-text descriptor.
   * Auto-filled from the discount-type description for known codes (01/02/03).
   * REQUIRED for code "99" (Otros) — surfaced as a hard validation error.
   */
  reason?: string;
}

export interface CodeFormEntry {
  /** Hacienda product-code type: "01" VENDOR, "02" BUYER, "03" MANUFACTURER, "04" INTERNAL, "99" OTROS. */
  codeTypeCode: string;
  value: string;
}

export interface ProductFormState {
  // General Info
  name: string;
  description: string;
  category_id: string;
  track_inventory: boolean;
  has_fiscal_info: boolean;

  // Packaging
  has_package_info: boolean;

  // Inventory
  low_stock_threshold: string;

  // Fiscal
  /** UUID of the data-services cabys row — this is what the BE wants for linking. */
  cabysId: string;
  /** 13-digit Hacienda code — kept for display + local tax calc branching (ISEBEC "2202"/"3401"). */
  cabys: string;
  cabysDescription: string;
  productTypeId?: number;

  // Factory tax charge (affects tax calculation)
  factoryTaxChargeId?: number;
  hasFactoryTax: boolean;

  // Product codes (barcode, manufacturer, etc.)
  codes: CodeFormEntry[];

  // Pricing
  price: string;

  // ── The rest of the document line ────────────────────────────────────
  // A product is the template a `DetalleLinea` is built from, so it carries
  // the same fields. These were absent, which is why every product reached an
  // invoice with `unit_measure` unset — Hacienda requires `UnidadMedida` on
  // every line, and the checkout had to fall back to "Unid" regardless of what
  // the product is actually sold by.
  /** Hacienda `UnidadMedida` code. Defaults to `Unid` — never saved empty. */
  unitMeasure: string;
  /** Free-text commercial unit shown to the customer ("Caja de 12"). */
  commercialUnitMeasure: string;
  /** Partida arancelaria, for imported goods. */
  customsPart: string;
  /**
   * Editable taxable base. Legal only alongside tax code 07 (IVA cálculo
   * especial) or `IVACobradoFabrica` "01"; the backend rejects it elsewhere.
   */
  baseAmount: string;

  // ── Exoneración (Nota 10.1) ──────────────────────────────────────────
  // The CATALOG-level exoneration: an article that is always exonerated (a
  // free-trade-zone good, say) carries its authorization here, and an imported
  // order line copies it onto its IVA row. A per-sale exoneration is granted on
  // the line instead, in the line-detail drawer.
  //
  // These columns existed on the product and round-tripped through the types,
  // but no form could edit them (CALCULATION_AUDIT §"Exoneracion capture"), so
  // the data was unreachable.
  /** Nota 10.1 authorization document type (01-11, 99). */
  exemptionAuthorizationCode: string;
  /** `TarifaExonerada` — the percentage of the tax that is forgiven. */
  exemptedRate: string;
  /**
   * Authorization document number.
   *
   * NOTE: `Product` has no column for this yet, so it is form-only until one
   * exists — the line-level exoneration carries the number that reaches a
   * document. Kept here so the form can validate what it shows.
   */
  exemptionNumber: string;

  // Taxes & Discounts
  taxes: TaxFormEntry[];
  discounts: DiscountFormEntry[];

  // Image (handled externally via File, stored here as URL for edit mode)
  image_url?: string;
}

/**
 * Hacienda unit-of-measure code every product starts with.
 *
 * "Unid" (unidad) is the right default for a discrete article, which is what
 * most catalog entries are, and — more to the point — an EMPTY unit is not a
 * legal document line. Defaulting here means the field is never saved blank.
 */
export const DEFAULT_UNIT_MEASURE = "Unid";

/**
 * A new product starts with NO tax row: the IVA comes from the CABYS.
 *
 * Picking a CABYS code is what determines the rate — that is the whole point
 * of the taxonomy, and `FiscalInformationSection` fills the tax in from the
 * selected row. Seeding a 13% row here instead would put the general rate on
 * an article the catalog says is exempt or reduced, and the operator would have
 * to notice and undo it.
 *
 * The 13% fill is for products that ALREADY exist with no taxes and no CABYS —
 * the ones auto-created by an order import, which have nothing to derive from.
 * That runs once, in `be/store-be/scripts/backfill_product_iva.py`.
 */

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  description: "",
  category_id: "",
  track_inventory: false,
  has_fiscal_info: false,
  has_package_info: false,
  low_stock_threshold: "",
  cabysId: "",
  cabys: "",
  cabysDescription: "",
  productTypeId: undefined,
  factoryTaxChargeId: undefined,
  hasFactoryTax: false,
  codes: [],
  price: "",
  unitMeasure: DEFAULT_UNIT_MEASURE,
  commercialUnitMeasure: "",
  customsPart: "",
  baseAmount: "",
  exemptionAuthorizationCode: "",
  exemptedRate: "",
  exemptionNumber: "",
  taxes: [],
  discounts: [],
};
