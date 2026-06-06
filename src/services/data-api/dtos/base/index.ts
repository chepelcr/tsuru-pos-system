/**
 * Data Services DTO Base Types
 * 
 * This module exports the hierarchical base type system for data-services DTOs.
 * All base types use snake_case field naming to match the Python API responses directly,
 * eliminating the need for field name transformations.
 * 
 * Type Hierarchy:
 * 
 * Level 1: SimpleBase
 *   ├─ Level 2a: GlobalCatalogBase (no country_code)
 *   └─ Level 2b: CatalogBase (with country_code)
 *        └─ Level 3: CodedCatalogBase (adds code field)
 *             └─ Level 4: HaciendaBase (adds document_version_id)
 * 
 * Usage Guidelines:
 * 
 * 1. SimpleBase: Use for entities with minimal fields (id, timestamps)
 *    - notification-codes
 *    - location entities (countries, states, etc.)
 * 
 * 2. GlobalCatalogBase: Use for global catalogs without country scope
 *    - customer-types
 *    - product-types
 *    - tax-rate-codes
 * 
 * 3. CatalogBase: Use for country-scoped catalogs without codes
 *    - document-versions
 *    - tax-amounts
 *    - tax-factors
 *    - national-taxpayer-companies
 * 
 * 4. CodedCatalogBase: Use for country-scoped catalogs with codes
 *    - identifications
 *    - discount-types
 *    - documents
 *    - regimes
 *    - pharmaceutical-forms
 *    - economic-activities
 *    - national-taxpayer-special-fields
 * 
 * 5. HaciendaBase: Use for Hacienda versioned entities
 *    - codes
 *    - taxes
 *    - transactions
 *    - tax-rates
 *    - tax-conditions
 *    - sale-conditions
 *    - references
 *    - payments
 *    - reference-codes
 *    - other-charges
 *    - factory-tax-charges
 *    - exemptions
 *    - exemptions-issuing-institutions
 *    - measurement-units
 * 
 * Benefits:
 * - Zero transformation overhead (direct API response usage)
 * - Consistent snake_case across all layers
 * - Reduced code duplication
 * - Type safety with TypeScript
 * - Clear service classification
 */

export type { SimpleBase } from './simple-base';
export type { GlobalCatalogBase } from './global-catalog-base';
export type { CatalogBase } from './catalog-base';
export type { CodedCatalogBase } from './coded-catalog-base';
export type { HaciendaBase } from './hacienda-base';

/**
 * Service classification type unions for better type safety
 */

// Services using SimpleBase
export type SimpleBaseServices = 
  | 'notification-codes'
  | 'countries'
  | 'states'
  | 'counties'
  | 'districts'
  | 'neighborhoods';

// Services using GlobalCatalogBase
export type GlobalCatalogServices = 
  | 'customer-types'
  | 'product-types'
  | 'tax-rate-codes';

// Services using CatalogBase
export type CatalogServices = 
  | 'document-versions'
  | 'tax-amounts'
  | 'tax-factors'
  | 'national-taxpayer-companies';

// Services using CodedCatalogBase
export type CodedCatalogServices = 
  | 'identifications'
  | 'discount-types'
  | 'documents'
  | 'regimes'
  | 'pharmaceutical-forms'
  | 'economic-activities'
  | 'national-taxpayer-special-fields';

// Services using HaciendaBase
export type HaciendaServices = 
  | 'codes'
  | 'taxes'
  | 'transactions'
  | 'tax-rates'
  | 'tax-conditions'
  | 'sale-conditions'
  | 'references'
  | 'payments'
  | 'reference-codes'
  | 'other-charges'
  | 'factory-tax-charges'
  | 'exemptions'
  | 'exemptions-issuing-institutions'
  | 'measurement-units';
