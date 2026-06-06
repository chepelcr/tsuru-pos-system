/**
 * Reference to another electronic document (NC/ND/etc.).
 *
 * Mirrors jbiller_common.dtos.documents.reference_dto.ReferenceDTO.
 * Both `type` (reference document type) and `code` (reference action
 * code "01" Anula / "02" Corrige / ...) are Hacienda code strings.
 */
export interface SaleReference {
  /** Hacienda reference document type code. */
  type: string;
  /** Required when type = "99" (Otros). */
  other_type?: string;
  number: string;
  /** ISO 8601 date string (yyyy-MM-dd) or full datetime. */
  date: string;
  /** Hacienda reference action code: "01" Anula | "02" Corrige | ... */
  code: string;
  other_code?: string;
  reason?: string;
}
