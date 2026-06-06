/**
 * CodedCatalogBase - Level 3 Base Type
 * 
 * Base type for catalog entities that have a code field.
 * Extends CatalogBase and adds a code field for entities with unique codes per country.
 * 
 * Additional field beyond CatalogBase:
 * - code: Entity code (unique per country)
 * 
 * Used by:
 * - identifications
 * - discount-types
 * - documents
 * - regimes
 * - pharmaceutical-forms
 * - economic-activities
 * - national-taxpayer-special-fields
 */
import { CatalogBase } from './catalog-base';

export interface CodedCatalogBase extends CatalogBase {
  /**
   * Entity code (unique per country)
   * Example: "01", "02", "03"
   */
  code: string;
}
