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
 * The remaining numeric ids on these entries (taxRateId, taxFactorId,
 * taxAmountId) are intentionally kept — they reference data-services catalog
 * rows that have no Hacienda equivalent, and the BE accepts them as opaque
 * string references on `tax_rate.id` / `tax_factor.id` / `tax_amount.id`.
 */

export interface TaxFormEntry {
  /** Hacienda tax type code: "01" IVA, "02" ISC, "07" IVACE, "08" IVARBU, "99" OTROS, etc. */
  taxCode: string;
  rate: number;
  /** data-services tax-rate catalog id (opaque). */
  taxRateId?: number;
  /** data-services tax-factor catalog id (opaque). */
  taxFactorId?: number;
  /** IVARBU factor value (e.g. 0.13). Captured at select time so the BE receives the real number. */
  taxFactor?: number;
  specialFields?: {
    quantity?: number;
    percentage?: number;
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

  // Taxes & Discounts
  taxes: TaxFormEntry[];
  discounts: DiscountFormEntry[];

  // Image (handled externally via File, stored here as URL for edit mode)
  image_url?: string;
}

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
  taxes: [],
  discounts: [],
};
