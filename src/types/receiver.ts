/**
 * Customer (receiver) types — canonical Hacienda DocumentDTO shape.
 *
 * Mirrors jbiller_common.dtos.documents.customer_dto.CustomerDTO. Nested:
 * identification, phone (single), fax, residence, economic_activity. All
 * Hacienda enum-like fields are code STRINGS ("01", "02", ...), never
 * numeric IDs — the sales-api Lambda has no access to the data-api catalog.
 *
 * ResidenceLocalState.neighborhood_id is kept for the LocationSelect
 * cascade only. useCartFlow resolves it to Residence.neighborhood_name at
 * submit time (Hacienda spec wants the name, not the id).
 */

export interface Phone {
  country_code?: string;
  area_code?: string;
  number?: string;
  description?: string;
}

export interface Identification {
  /** Hacienda ID type code: "01" Física | "02" Jurídica | "03" DIMEX | "04" NITE. */
  code?: string;
  type_id?: number;
  description?: string;
  number?: string;
}

/**
 * Local-state residence with neighborhood_id for the LocationSelect cascade.
 * Use for component state; convert to Residence (with name) at submit time.
 */
export interface ResidenceLocalState {
  state_id?: number;
  state_name?: string;
  county_id?: number;
  county_name?: string;
  district_id?: number;
  district_name?: string;
  neighborhood_id?: number;
  neighborhood_name?: string;
  country_code?: string;
  country_name?: string;
  address?: string;
}

export interface Residence {
  state_id?: number;
  state_name?: string;
  county_id?: number;
  county_name?: string;
  district_id?: number;
  district_name?: string;
  /** Hacienda canonical: NAME (not id). */
  neighborhood_name?: string;
  country_code?: string;
  country_name?: string;
  address?: string;
}

export interface EconomicActivity {
  code?: string;
  description?: string;
}

/** Canonical receiver (CustomerDTO) — sent to POST /sales. */
export interface SaleReceiver {
  name?: string;
  trade_name?: string;
  nationality?: string;
  email?: string;
  identification?: Identification;
  residence?: Residence;
  phone?: Phone;
  fax?: Phone;
  economic_activity?: EconomicActivity;
  foreign_id_number?: string;
  foreign_address?: string;
  /** Hacienda customer type code "01"-"05". */
  customer_type_code?: string;
}

/** In-progress receiver for component forms. Keeps neighborhood_id. */
export interface SaleReceiverDraft extends Omit<SaleReceiver, 'residence'> {
  residence?: ResidenceLocalState;
}
