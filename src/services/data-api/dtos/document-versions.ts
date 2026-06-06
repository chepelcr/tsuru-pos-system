import { CatalogBase } from './base';

export interface GetDocumentVersionParams {
  iso_code: string;
  id?: string;
  version_number?: string;
}

export interface GetAllDocumentVersionsParams {
  iso_code: string;
  status?: string;
}

export interface GetDocumentVersionByIdParams {
  iso_code: string;
  id: string;
}

/**
 * Document version response from the document-versions service.
 * Extends CatalogBase which includes: id, description, country_code,
 * status, created_on, updated_on, deleted_on
 */
export interface DocumentVersionResponse extends CatalogBase {
  version_number: string;
  version_date: string;
  expiration_date: string;
}

export type DocumentVersionListResponse = DocumentVersionResponse[];
