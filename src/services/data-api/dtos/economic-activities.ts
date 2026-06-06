import { CodedCatalogBase } from './base';

export interface GetEconomicActivityParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllEconomicActivitiesParams {
  iso_code: string;
  status?: string;
}

/**
 * Economic activity response from the economic-activities service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code,
 * status, created_on, updated_on, deleted_on
 */
export interface EconomicActivityResponse extends CodedCatalogBase {
  // All fields inherited from CodedCatalogBase
}

export type EconomicActivityListResponse = EconomicActivityResponse[];
