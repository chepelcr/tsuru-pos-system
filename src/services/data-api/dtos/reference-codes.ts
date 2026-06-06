import { HaciendaBase } from './base';

export interface GetReferenceCodeParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllReferenceCodesParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Reference code response from the reference-codes service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface ReferenceCodeResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type ReferenceCodeListResponse = ReferenceCodeResponse[];
