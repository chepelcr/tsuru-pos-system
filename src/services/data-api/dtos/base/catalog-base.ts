/**
 * CatalogBase - Level 2b Base Type
 * 
 * Base type for catalog entities with country scope.
 * Extends SimpleBase and adds description, country_code, status, and soft delete support.
 * 
 * Additional fields beyond SimpleBase:
 * - description: Entity description
 * - country_code: ISO country code (3-digit)
 * - status: Status indicator (1=active, 2=inactive, 3=removed)
 * - deleted_on: Soft delete timestamp (null if active)
 * 
 * Used by:
 * - document-versions
 * - tax-amounts
 * - tax-factors
 * - national-taxpayer-companies
 */
import { SimpleBase } from './simple-base';

export interface CatalogBase extends SimpleBase {
  /**
   * Entity description
   */
  description: string;

  /**
   * ISO country code (3-digit format)
   * Example: "188" for Costa Rica, "840" for USA
   */
  country_code: string;

  /**
   * Status indicator
   * - 1: Active
   * - 2: Inactive
   * - 3: Removed
   */
  status: number;

  /**
   * Soft delete timestamp (ISO 8601 format)
   * null if the entity is active
   */
  deleted_on: string | null;
}
