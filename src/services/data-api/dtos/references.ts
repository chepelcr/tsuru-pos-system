import { HaciendaBase } from './base';

export interface GetReferenceParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllReferencesParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Reference response from the references service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface ReferenceResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type ReferenceListResponse = ReferenceResponse[];
