import type { ClientSearchResult } from '@/hooks/useClientSearch';
import type { SaleReceiver } from '@/types/receiver';

/** Map the selected client, then apply this document's explicit edits. */
export function buildDocumentReceiver(inbound?: SaleReceiver | null, client?: ClientSearchResult | null): SaleReceiver | null {
  if (!client && !inbound) return null;
  const base: SaleReceiver = client ? {
    name: client.business_name || client.client_name || undefined,
    trade_name: client.client_name || undefined,
    nationality: client.nationality || undefined,
    customer_type_code: client.customer_type != null ? String(client.customer_type).padStart(2, '0') : undefined,
    email: client.email || undefined,
    identification: client.identification ? {
      code: client.identification.code || undefined,
      number: client.identification.number || undefined,
    } : undefined,
    phone: client.phone ? {
      country_code: client.phone.country_code || undefined,
      area_code: client.phone.area_code || undefined,
      number: client.phone.number || undefined,
      description: client.phone.description || undefined,
    } : undefined,
    residence: client.residence ? {
      state_id: client.residence.state_id ?? undefined,
      county_id: client.residence.county_id ?? undefined,
      district_id: client.residence.district_id ?? undefined,
      address: client.residence.address ?? undefined,
    } : undefined,
  } : {};
  const defined = Object.fromEntries(Object.entries(inbound ?? {}).filter(([, value]) => value !== undefined));
  const result: SaleReceiver = { ...base, ...defined };
  const id = result.identification;
  if (id) result.identification = {
    ...id,
    number: ['05', '06'].includes(id.code ?? '') ? id.number?.trim() : id.number?.replace(/\D/g, ''),
  };
  if (result.residence) {
    const { state_id, state_name, county_id, county_name, district_id, district_name, neighborhood_name, address } = result.residence;
    result.residence = id?.code === '05' ? { address } : {
      state_id, state_name, county_id, county_name, district_id, district_name, neighborhood_name, address,
    };
  }
  return Object.values(result).some(Boolean) ? result : null;
}
