import { CodedCatalogBase } from './base';

export interface GetRegimeParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllRegimesParams {
  iso_code: string;
  status?: string;
}

/**
 * Regime response from the regimes service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface RegimeResponse extends CodedCatalogBase {
  // All fields inherited from CodedCatalogBase
}

export type RegimeListResponse = RegimeResponse[];
