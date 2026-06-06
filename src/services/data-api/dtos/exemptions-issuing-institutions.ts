import { HaciendaBase } from './base';

export interface GetExemptionIssuingInstitutionParams {
  iso_code: string;
  id?: string;
  code?: string;
  document_version_id?: string;
}

export interface GetAllExemptionIssuingInstitutionsParams {
  iso_code: string;
  document_version_id: number;
  status?: string;
}

/**
 * Exemption issuing institution response from the exemptions-issuing-institutions service.
 * Extends HaciendaBase which includes: id, code, description, country_code, 
 * status, document_version_id, created_on, updated_on, deleted_on
 */
export interface ExemptionIssuingInstitutionResponse extends HaciendaBase {
  // All fields inherited from HaciendaBase
}

export type ExemptionIssuingInstitutionListResponse = ExemptionIssuingInstitutionResponse[];
