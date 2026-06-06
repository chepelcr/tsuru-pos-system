import { CodedCatalogBase } from './base';

export interface GetPharmaceuticalFormParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllPharmaceuticalFormsParams {
  iso_code: string;
  status?: string;
}

/**
 * Pharmaceutical form response from the pharmaceutical-forms service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface PharmaceuticalFormResponse extends CodedCatalogBase {
  // All fields inherited from CodedCatalogBase
}

export type PharmaceuticalFormListResponse = PharmaceuticalFormResponse[];
