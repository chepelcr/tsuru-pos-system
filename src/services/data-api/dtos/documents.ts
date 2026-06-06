import { CodedCatalogBase } from './base';

export interface GetDocumentTypeParams {
  iso_code: string;
  id?: string;
  code?: string;
}

export interface GetAllDocumentTypesParams {
  iso_code: string;
  status?: string;
  description?: string;
  biller?: string;
}

/**
 * Document type response from the documents service.
 * Extends CodedCatalogBase which includes: id, code, description, country_code, 
 * status, created_on, updated_on, deleted_on
 */
export interface DocumentTypeResponse extends CodedCatalogBase {
  biller: boolean;
  document_type: string;
}

export type DocumentTypeListResponse = DocumentTypeResponse[];
