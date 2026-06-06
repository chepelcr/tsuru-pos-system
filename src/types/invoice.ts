/**
 * Document (sale) types — canonical Hacienda DocumentDTO shape.
 *
 * Mirrors jbiller_common.dtos.documents.document_dto.DocumentDTO plus the
 * CreateSaleDTO / SaleResponse wrappers. All Hacienda enum-like fields are
 * code STRINGS:
 *   - document_type        "01" FE | "02" ND | "03" NC | "04" TE | "08" FC | "09" FExp
 *   - sale_condition       "01" Contado | "02" Crédito | ...
 *   - Payment.type         "01" Efectivo | "02" Tarjeta | ... | "99" Otros
 *   - Reference.{type,code} both Hacienda codes
 *   - LineTax.{code,rate_code}, LineDiscount.discount_type — see lineDetail.ts
 *
 * Field naming matches the canonical: branch_number/terminal_number (was
 * branch_code/terminal_code), sale_condition (was sale_condition_id),
 * Payment.type (was payment_type_id), version (was version_id).
 */

import type { SaleReceiver, Identification } from './receiver';
import type { SaleReference } from './reference';
import type { LineDetail } from './lineDetail';
import type { PaginationResponse } from './pagination';

// ── Currency (CurrencyDTO) ─────────────────────────────────────────────────
export interface CurrencyCode {
  /** ISO 4217: CRC | USD | EUR. */
  currency_code: string;
  exchange_rate?: number;
  dollar_exchange_rate?: number;
}

// ── Payment (PaymentDTO) ───────────────────────────────────────────────────
export interface SalePayment {
  /** Hacienda payment type code "01"-"99". */
  type: string;
  /** Required when type = "99" (Otros). */
  other_type?: string;
  amount: number;
  amount_dollar?: number;
  amount_colones?: number;
  document_currency_code?: CurrencyCode;
  /** ISO 8601 datetime. */
  payment_date?: string;
}

// ── Document type catalog (Hacienda codes as strings) ──────────────────────
export const DOCUMENT_TYPES = [
  { code: '01', label: 'Factura Electrónica', short: 'FE',   color: 'text-green-600',  tabGradient: 'from-green-600 to-green-700',   dotColor: '#16a34a' },
  { code: '04', label: 'Tiquete Electrónico', short: 'TE',   color: 'text-blue-600',   tabGradient: 'from-blue-500 to-blue-600',     dotColor: '#3b82f6' },
  { code: '03', label: 'Nota de Crédito',     short: 'NC',   color: 'text-red-600',    tabGradient: 'from-red-500 to-red-600',       dotColor: '#ef4444' },
  { code: '02', label: 'Nota de Débito',      short: 'ND',   color: 'text-yellow-600', tabGradient: 'from-yellow-500 to-yellow-600', dotColor: '#eab308' },
  { code: '08', label: 'Factura de Compra',   short: 'FC',   color: 'text-purple-600', tabGradient: 'from-purple-500 to-purple-600', dotColor: '#a855f7' },
  { code: '09', label: 'Factura Exportación', short: 'FExp', color: 'text-indigo-600', tabGradient: 'from-indigo-500 to-indigo-600', dotColor: '#6366f1' },
] as const;

/** Hacienda document type code as a string literal union. */
export type DocTypeCode = '01' | '02' | '03' | '04' | '08' | '09';

/** Lookup helper for tab/badge rendering. */
export function getDocumentTypeInfo(code: string) {
  return DOCUMENT_TYPES.find((d) => d.code === code);
}

// ── Validation (AtvValidationDTO + ReceiverValidationDTO) ──────────────────
export interface HaciendaError {
  id?: number;
  code?: string;
  message?: string;
  row?: number;
  column?: number;
}

export interface AtvValidation {
  /** 1 = Validated, 2 = Pending, 3 = Rejected. */
  validation_status?: number;
  send_date?: string;
  validation_date?: string;
  errors?: HaciendaError[];
}

export interface ReceiverValidation {
  /** 1 = Accepted, 2 = PartialAccept, 3 = Rejected. */
  status?: number;
  message?: string;
  consecutive?: string;
  validation_date?: string;
  sent_to_hacienda?: boolean;
}

// ── Summary (SummaryDTO + TaxSummaryDTO) ───────────────────────────────────
export interface TaxSummary {
  tax_type?: string;
  tax_rate_code?: string;
  tax_amount?: number;
}

export interface DocumentSummary {
  currency_code?: CurrencyCode;
  taxed_services?: number;
  tax_free_services?: number;
  exempt_services?: number;
  taxed_merchandise?: number;
  tax_free_merchandise?: number;
  exempt_merchandise?: number;
  taxed_total?: number;
  tax_free_total?: number;
  iva_total?: number;
  exempt_total?: number;
  sale_total?: number;
  discount_total?: number;
  net_total?: number;
  tax_total?: number;
  returned_tax?: number;
  other_charges_total?: number;
  voucher_total?: number;
  payments_total?: number;
  non_taxable_services?: number;
  non_taxable_merchandise?: number;
  non_taxable_total?: number;
  total_factory_tax?: number;
  total_exemptions?: number;
  tax_summary?: TaxSummary[];
}

// ── Attachments / OtherCharges / OtherFields / UserAttachments ─────────────
export interface XmlFile {
  file_name?: string;
  file_path?: string;
  file_url?: string;
  file_size?: number;
}

export interface DocumentAttachments {
  xml_document?: XmlFile;
  receiver_validation_document?: XmlFile;
  atv_validation_document?: XmlFile;
  html_document_url?: string;
  footer_document_url?: string;
}

export interface UserAttachment {
  document_id?: number;
  file_name?: string;
  file_path?: string;
  file_size?: string;
}

export interface OtherPerson {
  identification?: Identification;
  name?: string;
}

export interface OtherCharge {
  /** Hacienda other-charge type code. */
  type: string;
  other_charge_type?: string;
  other_person?: OtherPerson;
  description?: string;
  percentage?: number;
  amount?: number;
  amount_dollar?: number;
  amount_colones?: number;
  document_currency_code?: CurrencyCode;
}

export interface OtherText {
  other_field_id?: number;
  code?: string;
  other_text?: string;
}

// ── Root document (DocumentDTO; both request & response) ───────────────────
/**
 * Outbound POST /sales payload + inbound GET /sales/:id response.
 *
 * The FE fills the input subset (header + parties + details + payments +
 * references); the BE computes summary, atv_validation, consecutive_number.
 */
export interface SaleDocument {
  // Identifiers
  sale_id?: string;
  document_id?: number;
  organization_id?: string;
  assignment_id?: string;
  branch_id?: string;
  terminal_id?: string;
  client_id?: string | null;

  // Hacienda metadata
  document_type: DocTypeCode;
  activity_code: string;
  receiver_activity_code?: string;
  terminal_number: number;
  branch_number: number;
  consecutive_number?: string;
  sub_consecutive_number?: number;
  sale_date?: string;
  document_key?: string;
  /** Hacienda sale condition code. */
  sale_condition: string;
  sale_condition_description?: string;
  expiration_date?: string;
  credit_term?: string;
  notes?: string;
  country_code?: string;
  version?: string;
  payment_status?: number;
  is_received?: boolean;
  taxpayer_id?: string;

  // Parties + content
  receiver?: SaleReceiver | null;
  copy_emails?: string[];
  details: LineDetail[];
  other_charges?: OtherCharge[];
  user_attachments?: UserAttachment[];
  payments: SalePayment[];
  references?: SaleReference[];
  other_fields?: OtherText[];
  attachments?: DocumentAttachments;

  // Totals
  summary?: DocumentSummary;
  summary_dollar?: DocumentSummary;
  summary_colon?: DocumentSummary;

  // Hacienda output
  document_name?: string;
  document_route?: string;
  document_status?: number;
  pdf_url?: string;
  xml_url?: string;
  json_url?: string;
  receiver_validation?: ReceiverValidation;
  atv_validation?: AtvValidation;

  // Notification tracking
  notified?: boolean;
  send_attempts?: number;
  uploaded?: boolean;
  notification_send_date?: string;

  // Audit
  created_by?: string;
  created_on?: string;
  updated_on?: string;
}

/** Backwards-compatible aliases for existing imports. */
export type InvoiceRequest = SaleDocument;
export type SaleResponse = SaleDocument;

export interface SaleListResponse {
  data: SaleResponse[];
  pagination: PaginationResponse;
}

/**
 * Form state for creating/editing a sale in DocumentsPage tabs.
 * Same shape as the canonical request — partial during editing.
 */
export interface InvoiceFormData {
  document_type: DocTypeCode;
  version?: string;
  activity_code: string;
  sale_condition: string;
  credit_term: string;
  notes?: string;
  copy_emails: string[];
  /** Document-level currency. */
  currency: CurrencyCode;
  receiver?: SaleReceiver;
  details: LineDetail[];
  payments: SalePayment[];
  references: SaleReference[];
}
