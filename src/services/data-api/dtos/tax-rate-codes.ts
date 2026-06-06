import { GlobalCatalogBase } from './base';

export interface GetTaxRateCodeParams {
  id?: string;
}

export interface GetAllTaxRateCodesParams {
  status?: string;
  description?: string;
}

/**
 * Tax rate code response from the tax-rate-codes service.
 * Extends GlobalCatalogBase which includes: id, description, status, 
 * created_on, updated_on, deleted_on
 */
export interface TaxRateCodeResponse extends GlobalCatalogBase {
  // All fields inherited from GlobalCatalogBase
}

export type TaxRateCodeListResponse = TaxRateCodeResponse[];
