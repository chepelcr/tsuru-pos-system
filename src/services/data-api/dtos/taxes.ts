import { HaciendaBase } from './base';

export interface GetTaxParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllTaxesParams {
  iso_code: string;
  document_version_id?: number;
  status?: string;
}

/**
 * Tax response from the taxes service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface TaxResponse extends HaciendaBase {
  required_iva: boolean;
  percentage: number;
  special_fields_required: boolean;
}

export type TaxListResponse = TaxResponse[];

export interface GetTaxRateParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllTaxRatesParams {
  iso_code: string;
  document_version_id?: number;
  status?: string;
}

/**
 * Tax rate response from the tax-rates service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface TaxRateResponse extends HaciendaBase {
  rate_type_id: number;
  percentage: number;
}

export type TaxRateListResponse = TaxRateResponse[];
