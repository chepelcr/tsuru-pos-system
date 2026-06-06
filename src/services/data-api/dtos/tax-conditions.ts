import { HaciendaBase } from './base';

export interface GetTaxConditionParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllTaxConditionsParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Tax condition response from the tax-conditions service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface TaxConditionResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type TaxConditionListResponse = TaxConditionResponse[];
