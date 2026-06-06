import { HaciendaBase } from './base';

export interface GetCodeParams {
  iso_code: string;
  code_type_id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllCodesParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Code response from the codes service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface CodeResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type CodeListResponse = CodeResponse[];
