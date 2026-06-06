import { CatalogBase } from './base';

export interface GetTaxFactorParams {
  iso_code: string;
  id?: string;
}

export interface GetAllTaxFactorsParams {
  iso_code: string;
  status?: string;
}

/**
 * Tax factor response from the tax-factors service.
 * Extends CatalogBase which includes: id, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface TaxFactorResponse extends CatalogBase {
  /**
   * Factor value (e.g., 0.13 for 13%)
   */
  factor: number;
}

export type TaxFactorListResponse = TaxFactorResponse[];
