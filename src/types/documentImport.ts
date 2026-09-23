/**
 * XML document import (TSR-335) — wire shapes of
 * `POST|GET /api/organizations/{org}/documents/imports`.
 */

export type DocumentImportStatus =
  | 'PENDING_UPLOAD'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_FOREIGN'
  | 'DUPLICATE'
  | 'FAILED';

export interface DocumentImport {
  import_id: string;
  file_name: string;
  size?: number | null;
  status: DocumentImportStatus;
  clave?: string | null;
  document_type?: string | null;
  consecutive_number?: string | null;
  version?: string | null;
  direction?: 'ISSUED' | 'RECEIVED' | null;
  sale_id?: string | null;
  /** Hacienda verdict once validated: 1 accepted, 2 partial, 3 rejected. */
  atv_status?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  created_on?: string;
  updated_on?: string;
}

export interface DocumentImportUpload extends DocumentImport {
  /** Presigned S3 PUT — the file goes straight to S3, no size limit. */
  upload_url: string;
  /** Send these headers with the PUT exactly as given (they are signed). */
  upload_headers: Record<string, string>;
  expires_in: number;
}

export interface DocumentImportList {
  items: DocumentImport[];
}
