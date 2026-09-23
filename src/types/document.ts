/**
 * Document list + validation types (canonical Hacienda shape).
 *
 * AtvValidation / ReceiverValidation / DocumentSummary are re-exported from
 * `invoice.ts` to avoid two parallel definitions of the same canonical types.
 * This file owns the list-view-specific projections (DocumentListItem,
 * ComplexSearchFilters, etc.) used by the documents page.
 */

import type { DocumentOrigin } from './invoice';
import type { PaginationResponse } from './pagination';
import type {
  AtvValidation,
  DocumentAttachments,
  DocumentNotification,
  DocTypeCode,
  DocumentSummary,
  ReceiverValidation,
} from './invoice';

export type { AtvValidation, DocumentSummary, ReceiverValidation };

export interface InvoiceValidation {
  atv_validation?: AtvValidation;
  receiver_validation?: ReceiverValidation;
}

/**
 * Compact projection for list views (DocumentsListView, DocumentCard, ...).
 * Subset of SaleDocument with only the fields the list UI needs.
 */
export interface DocumentListItem {
  sale_id: string;
  organization_id: string;
  /** Hacienda document type code as string (was numeric). */
  document_type: DocTypeCode;
  sale_date?: string;
  consecutive_number?: string;
  document_key?: string;
  is_received?: boolean;
  /** Signed XML, PDF and Hacienda response urls — nothing else. */
  attachments?: DocumentAttachments;
  /** In-app notifications raised about this document (verdicts, rejections). */
  notifications?: DocumentNotification[];
  summary?: DocumentSummary;
  atv_validation?: AtvValidation;
  receiver_validation?: ReceiverValidation;
  pdf_url?: string;
  xml_url?: string;
  json_url?: string;
  created_on?: string;
  /** 'IMPORT' — uploaded as a signed XML (TSR-335). */
  origin?: DocumentOrigin;
  /** Hacienda does not know this clave in this environment (TSR-336). */
  foreign_environment?: boolean;
  /** Final amount after validated credit/debit notes (TSR-341). */
  adjusted_total?: number;
}

export interface DocumentListResponse {
  data: DocumentListItem[];
  pagination: PaginationResponse;
}

export type DateMode = 'single' | 'range';
export type NumericMode = 'single' | 'range';
/**
 * Inclusive operator for `single`-mode date filters — per-day precision so the
 * sales-api can map them straight to `start_date` / `end_date` bounds.
 */
export type DateOperator = '=' | '>=' | '<=';
/**
 * Strict operator for `single`-mode numeric filters (e.g. voucher total).
 * Matches the cross-app-be `SearchOperations` set (`:`, `>`, `<`).
 */
export type NumericOperator = '=' | '>' | '<';

export interface ComplexSearchFilters {
  /**
   * Free-text term from the main toolbar. The wire layer fans this out into
   * an OR across `consecutive_number`, `document_key`, `receiver_name` via
   * the `search_fields` payload — see `useSales.toWireSearch`.
   */
  searchTerm?: string;
  status?: 'validated' | 'pending' | 'rejected';
  /**
   * Scope to one branch, or one terminal OF that branch, by the codes stamped on
   * every document (imports included). A terminal code is unique only within its
   * branch, so `terminal_number` is ignored without `branch_number`.
   */
  branch_number?: number;
  terminal_number?: number;
  /** Issued in the platform (POS) or uploaded Hacienda XML (IMPORT) — TSR-335. */
  origin?: DocumentOrigin;

  // ── Date filter (single value with operator OR range) ────────────────────
  dateMode?: DateMode;
  /** Single-mode only. */
  dateOp?: DateOperator;
  /** Single-mode only. */
  dateValue?: string;
  /** Range-mode lower bound (also used as the resolved single-mode `>=` bound). */
  start_date?: string;
  /** Range-mode upper bound (also used as the resolved single-mode `<=` bound). */
  end_date?: string;

  // ── Voucher total filter (single value with operator OR range) ───────────
  totalMode?: NumericMode;
  /** Single-mode only. */
  totalOp?: NumericOperator;
  /** Single-mode only. */
  totalValue?: number;
  /** Range-mode lower bound. */
  totalMin?: number;
  /** Range-mode upper bound. */
  totalMax?: number;

  sort?: string;
}

export interface XmlFilesDto {
  pdf_url?: string;
  xml_url?: string;
  json_url?: string;
}
