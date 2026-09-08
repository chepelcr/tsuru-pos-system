/**
 * Mesas and cuentas abiertas (TSR-154 / TSR-158).
 *
 * One type for both: a bar tab is a *dynamic* table — a named holding place
 * for a cart, created when the tab opens and removed when it is paid. The bar
 * vertical therefore needs no second concept.
 */
export interface PosTable {
  table_id: string;
  organization_id: string;
  branch_id: string;
  code: string;
  name?: string | null;
  seats?: number | null;
  /** Free label — "terraza", "barra". Every venue names its own areas. */
  zone?: string | null;
  sort_order: number;
  /** True for a bar tab; false for the fixed floor plan. */
  is_dynamic: boolean;
  opened_by?: string | null;
  /** Document tab currently held here, if any. */
  held_document_id?: string | null;
  status: number;
}

export interface TableListResponse {
  data: PosTable[];
}

export interface TableCreateRequest {
  code: string;
  name?: string;
  seats?: number;
  zone?: string;
  sort_order?: number;
  is_dynamic?: boolean;
}

export interface TableUpdateRequest {
  name?: string;
  seats?: number;
  zone?: string;
  sort_order?: number;
  /** Null releases the table. */
  held_document_id?: string | null;
}
