import { HaciendaBase } from './base';

export interface GetExemptionParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllExemptionsParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Exemption response from the exemptions service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface ExemptionResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type ExemptionListResponse = ExemptionResponse[];
