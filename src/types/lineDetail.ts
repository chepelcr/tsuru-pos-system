/**
 * Sale line detail types — canonical Hacienda DocumentDTO shape.
 *
 * Mirrors jbiller_common.dtos.documents.{detail_dto,common_tax_dto,
 * discount_dto,exemption_dto,tax_special_fields_dto}.
 *
 * All Hacienda enum-like fields are code STRINGS, never numeric IDs:
 *   - tax `code` (was tax_type_id)        e.g. "01" IVA, "02" Selectivo
 *   - tax `rate_code` (was tax_rate_id)   e.g. "08" 13%
 *   - discount `discount_type` (was discount_type_id)
 *   - line `unit_measure` (was unit_id)   e.g. "Unid", "Sp", "kg"
 */

export interface TaxSpecialFields {
  quantity?: number;
  percentage?: number;
  proportion?: number;
  volume_consumption?: number;
  tax_unit_amount?: number;
  /** Hacienda tax-amount catalog id (kept as int per canonical). */
  tax_amount_id?: number;
}

export interface ExemptionInstitution {
  code?: string;
  name?: string;
}

export interface Exemption {
  /** Hacienda exemption document type code. */
  type?: string;
  /** Required when type = "99" (Otros). */
  other_type?: string;
  number?: string;
  institution?: ExemptionInstitution;
  article?: string;
  section?: string;
  issue_date?: string;
  percentage?: number;
  amount?: number;
}

export interface LineTax {
  /** Hacienda tax type code "01"-"99". */
  code: string;
  /** Required when code = "99" (Otros). */
  other_tax_type?: string;
  /** Hacienda tax rate code. */
  rate_code?: string;
  rate?: number;
  factor?: number;
  amount?: number;
  special_fields?: TaxSpecialFields;
  exemption?: Exemption;
}

export interface LineDiscount {
  /** Hacienda discount type code. */
  discount_type: string;
  /** Required when discount_type = "99" (Otros). */
  other_discount_type?: string;
  percentage?: number;
  amount?: number;
  /**
   * Canonical Hacienda Nota-20 free-text descriptor.
   * Auto-filled from the discount-type description for known codes (01/02/03).
   * REQUIRED for code "99" (Otros) — surfaced as a hard validation error.
   */
  reason?: string;
}

export interface LineCode {
  number?: string;
  /** Hacienda code type "01"-"99". */
  code_type?: string;
}

/**
 * Top-level line detail. Mirrors DetailDTO (extends CommonDetailDTO).
 *
 * Inputs the FE provides:
 *   line_number, product_id, description, quantity, net_price, cabys,
 *   unit_measure, taxes[], discounts[], codes[]
 *
 * Outputs the BE computes:
 *   subtotal, discount_amount, net_tax, total_amount, total_amount_line
 *   (plus currency variants *_dollar / *_colones).
 */
export interface LineDetail {
  line_number?: number;
  product_id?: string;
  product_type?: number;
  description: string;
  cabys?: string;
  quantity: number;
  /** Hacienda unit-of-measure code: "Unid", "Sp", "kg", "m", ... */
  unit_measure?: string;
  commercial_unit_measure?: string;
  customs_part?: string;
  factory_tax?: string;
  net_price: number;
  base_amount?: number;
  codes?: LineCode[];
  taxes: LineTax[];
  discounts: LineDiscount[];

  // Computed (FE pre-fills via taxCalculationService; BE recalculates)
  subtotal?: number;
  discount_amount?: number;
  net_tax?: number;
  total_amount?: number;
  total_amount_line?: number;
  factory_assumed_tax?: number;
}
