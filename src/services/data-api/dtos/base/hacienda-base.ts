/**
 * HaciendaBase - Level 4 Base Type
 * 
 * Complete base type for Hacienda versioned catalog entities.
 * Extends CodedCatalogBase and adds document_version_id for entities tied to specific document versions.
 * 
 * Additional field beyond CodedCatalogBase:
 * - document_version_id: Reference to document version (nullable)
 * 
 * This is the most complete base type, providing all common fields:
 * - id, created_on, updated_on (from SimpleBase)
 * - description, country_code, status, deleted_on (from CatalogBase)
 * - code (from CodedCatalogBase)
 * - document_version_id (from HaciendaBase)
 * 
 * Used by:
 * - codes
 * - taxes
 * - transactions
 * - tax-rates
 * - tax-conditions
 * - sale-conditions
 * - references
 * - payments
 * - reference-codes
 * - other-charges
 * - factory-tax-charges
 * - exemptions
 * - exemptions-issuing-institutions
 * - measurement-units
 */
import { CodedCatalogBase } from './coded-catalog-base';

export interface HaciendaBase extends CodedCatalogBase {
  /**
   * Document version identifier
   * References the specific version of the Hacienda document this entity belongs to
   * null if not tied to a specific document version
   */
  document_version_id: number | null;
}
