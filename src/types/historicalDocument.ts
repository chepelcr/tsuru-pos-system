/** SALES_API_BASE normalizes camelCase wire keys to snake_case. */
export interface HistoricalDocument {
  historical_document_id: string;
  organization_id: string;
  clave: string;
  document_type: string;
  branch_number: number;
  terminal_number: number;
  consecutive_number: number;
  consecutive_key: string;
  emission_date: string | null;
  issuer_name: string | null;
  issuer_id_type: string | null;
  issuer_id_number: string | null;
  receiver_name: string | null;
  receiver_id_type: string | null;
  receiver_id_number: string | null;
  /** Pydantic serializes Decimal as a string. Preserve it until display/export. */
  total_amount: string | number | null;
  tax_total: string | number | null;
  atv_status: 0 | 1 | 2 | 3;
  atv_validation_date: string | null;
  atv_errors: unknown[] | null;
  parent_clave: string | null;
  source: 'HISTORY' | 'POS';
  sale_id: string | null;
  status?: number;
  created_on?: string | null;
  updated_on?: string | null;
}

export interface HistoricalDocumentListResponse {
  data: HistoricalDocument[];
  pagination: { page: number; page_size: number; total_elements: number; total_pages: number };
  historical_requested: boolean;
}

export interface HistoricalSyncResponse {
  organization_id: string;
  requested: boolean;
  historical_requested: boolean;
}

export interface HistoricalDocumentFilters {
  document_types?: string[];
  branch_number?: number;
  terminal_number?: number;
  atv_status?: HistoricalDocument['atv_status'];
  search_term?: string;
  start_date?: string;
  end_date?: string;
  sort_direction?: 'asc' | 'desc';
}
