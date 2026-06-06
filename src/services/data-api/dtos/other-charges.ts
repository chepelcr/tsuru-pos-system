import { HaciendaBase } from './base';

export interface GetOtherChargeParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllOtherChargesParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Other charge response from the other-charges service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface OtherChargeResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type OtherChargeListResponse = OtherChargeResponse[];
