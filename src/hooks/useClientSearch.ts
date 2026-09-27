import type { Client } from "@/hooks/useClients";

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

/** A client row in the shape the POS cart and checkout carry. */
export function clientToSearchResult(c: Client): ClientSearchResult {
  return {
    client_id: c.client_id,
    client_name: c.client_name,
    business_name: c.business_name,
    client_gln: c.client_gln,
    identification: c.identification,
    email: c.email,
    phone: c.phone ? { area_code: c.phone.area_code, number: c.phone.number } : null,
    residence: c.residence
      ? {
          state_id: c.residence.state_id,
          county_id: c.residence.county_id,
          district_id: c.residence.district_id,
          neighborhood_id: c.residence.neighborhood_id,
          address: c.residence.address,
        }
      : null,
  };
}
