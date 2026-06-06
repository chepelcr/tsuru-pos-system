import { HaciendaBase } from './base';

export interface GetFactoryTaxChargeParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllFactoryTaxChargesParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Factory tax charge response from the factory-tax-charges service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface FactoryTaxChargeResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type FactoryTaxChargeListResponse = FactoryTaxChargeResponse[];
