/**
 * Document list + validation types (canonical Hacienda shape).
 *
 * AtvValidation / ReceiverValidation / DocumentSummary are re-exported from
 * `invoice.ts` to avoid two parallel definitions of the same canonical types.
 * This file owns the list-view-specific projections (DocumentListItem,
 * ComplexSearchFilters, etc.) used by the documents page.
 */

import type { PaginationResponse } from './pagination';
import type {
  AtvValidation,
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
  sale_date: string;
  consecutive_number?: string;
  document_key?: string;
  is_received: boolean;
  summary?: DocumentSummary;
  atv_validation?: AtvValidation;
  receiver_validation?: ReceiverValidation;
  pdf_url?: string;
  xml_url?: string;
  json_url?: string;
  created_on?: string;
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
