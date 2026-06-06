import { HaciendaBase } from './base';

export interface GetSaleConditionParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllSaleConditionsParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Sale condition response from the sale-conditions service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface SaleConditionResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type SaleConditionListResponse = SaleConditionResponse[];
