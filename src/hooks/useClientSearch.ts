export interface ClientSearchResult {
  client_id: string;
  client_name?: string | null;
  business_name?: string | null;
  client_gln?: string | null;
  nationality?: string | null;
  customer_type?: number | null;
  identification?: { code?: string | null; number?: string | null } | null;
  email?: string | null;
  phone?: { country_code?: string | null; area_code?: string | null; number?: string | null; description?: string | null } | null;
  residence?: { state_id?: number | null; county_id?: number | null; district_id?: number | null; neighborhood_id?: number | null; address?: string | null } | null;
}
