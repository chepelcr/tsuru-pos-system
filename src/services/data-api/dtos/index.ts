// Base types
export * from './base';

// Service DTOs - SimpleBase services
export * from './locations';
export * from './notification-codes';

// Service DTOs - GlobalCatalogBase services
export * from './customer-types';
export * from './product-types';
export * from './tax-rate-codes';

// Service DTOs - CatalogBase services
export * from './document-versions';
export * from './national-taxpayer-companies';
export * from './tax-amounts';
export * from './tax-factors';

// Service DTOs - CodedCatalogBase services
export * from './discount-types';
export * from './documents';
export * from './economic-activities';
export * from './identifications';
export * from './national-taxpayer-special-fields';
export * from './pharmaceutical-forms';
export * from './regimes';

// Service DTOs - HaciendaBase services
export * from './codes';
export * from './exemptions';
export * from './exemptions-issuing-institutions';
export * from './factory-tax-charges';
export * from './measurement-units';
export * from './other-charges';
export * from './payments';
export * from './reference-codes';
export * from './references';
export * from './sale-conditions';
export * from './tax-conditions';
export * from './taxes';
export * from './transactions';

// Consumer (Hacienda live data) services
export * from './consumer-cabys';
export * from './consumer-identifications';
export * from './consumer-exemptions';
export * from './consumer-exchange-rate';

/**
 * Service classification by base type.
 * 
 * SimpleBase services (2): Basic entities with id, created_on, updated_on
 * - locations, notification-codes
 * 
 * GlobalCatalogBase services (3): Global catalogs with description, status
 * - customer-types, product-types, tax-rate-codes
 * 
 * CatalogBase services (4): Country-specific catalogs
 * - document-versions, national-taxpayer-companies, tax-amounts, tax-factors
 * 
 * CodedCatalogBase services (7): Country-specific catalogs with code field
 * - discount-types, documents, economic-activities, identifications, 
 *   national-taxpayer-special-fields, pharmaceutical-forms, regimes
 * 
 * HaciendaBase services (14): Hacienda-specific catalogs with document_version_id
 * - codes, exemptions, exemptions-issuing-institutions, factory-tax-charges,
 *   measurement-units, other-charges, payments, reference-codes, references,
 *   sale-conditions, tax-conditions, taxes, transactions
 */
