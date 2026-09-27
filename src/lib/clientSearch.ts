import type { Client } from "@/hooks/useClients";
import type { ClientSearchResult } from "@/hooks/useClientSearch";

interface ClientSearchOptions {
  /** Free text: matches name OR business name OR identification number. */
  term?: string;
  status?: number | string;
  customerType?: number;
  /** `>field` / `<field`, appended as `orderBy>field`. */
  sort?: string;
}

/**
 * The `search` filter `GET /clients` understands (`ClientSearchFilters` in
 * store-be). One builder for every client list and picker.
 *
 * The backend DROPS a clause whose field it does not know, silently — so a
 * picker that sent the raw text (`juan`) or a camelCase field
 * (`clientName:*juan*`) got every client back, unfiltered, and looked like a
 * search that "shows nothing useful". `client_name` and `business_name` are
 * always-LIKE on the backend, so the term needs no wildcards; the offline
 * mirror (`readCachedClients`) reads this same shape.
 */
export function buildClientSearch({ term, status, customerType, sort }: ClientSearchOptions): string {
  const segs: string[] = [];
  if (status !== undefined && status !== "all") segs.push(`status:${status}`);
  if (customerType !== undefined) segs.push(`customer_type:${customerType}`);
  // `,` and parentheses are the filter grammar's own separators.
  const tt = (term ?? "").replace(/[(),]/g, " ").trim();
  if (tt) segs.push(`(client_name:${tt},business_name:${tt},id_number:${tt})`);
  if (sort) segs.push(`orderBy${sort}`);
  return segs.join(",");
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
