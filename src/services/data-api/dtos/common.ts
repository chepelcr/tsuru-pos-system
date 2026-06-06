/**
 * @deprecated This file is deprecated. Use base types from './base' instead.
 * 
 * Migration guide:
 * - BaseEntity → Use SimpleBase, GlobalCatalogBase, or CatalogBase
 * - CountryCodeEntity → Use CodedCatalogBase or HaciendaBase
 * - DocumentVersionEntity → Use DocumentVersionResponse from './document-versions'
 * - Currency → Use Currency from './locations'
 * 
 * See README.md for complete migration guide.
 */

export interface Currency {
  code: string;
  currencyNameEs: string;
  currencyNameEn: string;
  currencySymbol: string;
}

export interface BaseEntity {
  id: number;
  status: number;
  createdOn: string;
  updatedOn: string;
  deletedOn: string | null;
}

export interface CountryCodeEntity extends BaseEntity {
  code: string;
  description: string;
  countryCode: string;
}

export interface DocumentVersionEntity {
  versionId: number;
  description: string;
  versionNumber: string;
  versionDate: string;
  expirationDate: string;
  countryCode: string;
  status: number;
  createdOn: string;
  updatedOn: string;
  deletedOn: string;
}
