import { CodedCatalogBase } from './base';

export interface GetIdentificationParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllIdentificationsParams {
  iso_code: string;
  status?: string;
}

/**
 * Identification response from the identifications service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface IdentificationResponse extends CodedCatalogBase {
  // All fields inherited from CodedCatalogBase
}

export type IdentificationListResponse = IdentificationResponse[];
