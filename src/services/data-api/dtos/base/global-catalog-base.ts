/**
 * GlobalCatalogBase - Level 2a Base Type
 * 
 * Base type for global catalog entities with no country scope.
 * Extends SimpleBase and adds description, status, and soft delete support.
 * 
 * Additional fields beyond SimpleBase:
 * - description: Entity description
 * - status: Status indicator (1=active, 2=inactive, 3=removed)
 * - deleted_on: Soft delete timestamp (null if active)
 * 
 * Note: Does NOT include country_code (global scope)
 * 
 * Used by:
 * - customer-types
 * - product-types
 * - tax-rate-codes
 */
import { SimpleBase } from './simple-base';

export interface GlobalCatalogBase extends SimpleBase {
  /**
   * Entity description
   */
  description: string;

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
