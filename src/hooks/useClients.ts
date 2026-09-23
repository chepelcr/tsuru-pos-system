import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { isOfflineError } from "@/lib/offline";
import { cacheClients, readCachedClients } from "@/services/offlineCatalog";

// ─── Sub-types matching backend DTOs ──────────────────────────────────────

export interface PhoneValue {
  /** ISO numeric country code (188) — the key the country select uses. */
  country_code?: string | null;
  /** Dialing code (506), resolved by store-be from the countries table. Read-only. */
  dial_code?: string | null;
  /** Area code of a shared +1 country (+1-869 → 869). Read-only. */
  dial_area?: string | null;
  area_code?: string | null;
  number?: string | null;
  description?: string | null;
}

export interface IdentificationValue {
  code?: string | null;   // "01" = Física, "02" = Jurídica, "03" = DIMEX, "04" = NITE
  number?: string | null;
}

export interface ResidenceValue {
  state_id?: number | null;
  county_id?: number | null;
  district_id?: number | null;
  neighborhood_id?: number | null;
  address?: string | null;
}

// ─── Client response (matches ClientResponse from backend) ────────────────

export interface Client {
  client_id: string;
  company_id: string;
  customer_type?: number | null;
  client_name?: string | null;      // individual / personal name
  business_name?: string | null;    // company / legal entity name
  client_gln?: string | null;       // GLN / commercial ID
  nationality?: string | null;
  identification?: IdentificationValue | null;
  email?: string | null;
  phone?: PhoneValue | null;
  residence?: ResidenceValue | null;
  /** Free-text customer note (plan 02 §2.3 / §6.3). */
  notes?: string | null;
  status: number;
}

export interface ClientListResponse {
  data: Client[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}

// ─── Request DTO (matches ClientRequestDTO from backend) ──────────────────

export interface CreateClientDto {
  customer_type?: number;
  client_name?: string;
  client_gln?: string;
  business_name?: string;
  nationality?: string;
  identification?: { code?: string; number?: string };
  email?: string;
  phone?: { country_code?: string; area_code?: string; number?: string; description?: string };
  residence?: { state_id?: number; county_id?: number; district_id?: number; neighborhood_id?: number; address?: string };
  /** Free-text customer note (plan 02 §2.3 / §6.3). */
  notes?: string;
}

export type UpdateClientDto = Partial<CreateClientDto>;

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns the best display name for a client. */
export function clientDisplayName(c: Client | null | undefined): string {
  return c?.client_name || c?.business_name || c?.client_gln || "Sin nombre";
}

/**
 * Formats a phone for display: `+506 8888-8888`.
 *
 * The prefix is the backend's `dial_code` (countries catalog) — never
 * `country_code`, which is the ISO code (188) and rendered as "+188".
 */
export function formatPhone(phone: PhoneValue | null | undefined): string {
  if (!phone?.number) return "";
  const local = [phone.area_code, phone.number].filter(Boolean).join("-");
  const prefix = [phone.dial_code && `+${phone.dial_code}`, phone.dial_area].filter(Boolean).join(" ");
  return prefix ? `${prefix} ${local}` : local;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useClients(
  orgId: string | undefined,
  filters?: { search?: string; page?: number; page_size?: number }
) {
  const searchParam = filters?.search ? `&search=${encodeURIComponent(filters.search)}` : "";
  const pageParam = filters?.page ? `&page=${filters.page}` : "";
  const sizeParam = `&page_size=${filters?.page_size ?? 24}`;

  return useQuery({
    queryKey: ["clients", orgId, filters],
    enabled: !!orgId,
    // Offline-capable: mirrors each page into IndexedDB and reads back from it
    // when connectivity fails (docs/OFFLINE.md).
    queryFn: async () => {
      try {
        const response = await crossAppApi.get<ClientListResponse>(
          crossAppOrgPath(orgId!, `/clients?${searchParam}${pageParam}${sizeParam}`)
        );
        void cacheClients(orgId!, response.data ?? []);
        return response;
      } catch (error) {
        if (!isOfflineError(error)) throw error;
        return readCachedClients(orgId!, {
          search: filters?.search,
          page: filters?.page,
          pageSize: filters?.page_size ?? 24,
        });
      }
    },
  });
}

export function useClient(orgId: string | undefined, clientId: string | undefined) {
  return useQuery({
    queryKey: ["client", orgId, clientId],
    enabled: !!orgId && !!clientId,
    queryFn: () =>
      crossAppApi.get<Client>(crossAppOrgPath(orgId!, `/clients/${clientId}`)),
  });
}

export function useCreateClient(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateClientDto) =>
      crossAppApi.post<Client>(crossAppOrgPath(orgId!, "/clients"), dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", orgId] });
    },
  });
}

/**
 * A loaded client as the update payload that would leave it unchanged.
 *
 * The update is a **PUT**, so it replaces rather than merges: a payload
 * carrying only the field you meant to change drops the client's name with it,
 * and the backend refuses a client with no name at all. Callers that edit one
 * field — the notes panel — build on this rather than sending that field alone.
 */
export function clientToDto(client: Client): UpdateClientDto {
  return {
    customer_type: client.customer_type ?? undefined,
    nationality: client.nationality ?? undefined,
    ...(client.client_name && { client_name: client.client_name }),
    ...(client.business_name && { business_name: client.business_name }),
    ...(client.client_gln && { client_gln: client.client_gln }),
    ...(client.email && { email: client.email }),
    // The response types every nested field as nullable; the request type does
    // not accept null. Dropped rather than coerced — a null on the way out means
    // "not recorded", and sending it back as "" would record an empty string.
    ...(client.identification && {
      identification: {
        code: client.identification.code ?? undefined,
        number: client.identification.number ?? undefined,
      },
    }),
    ...(client.phone && {
      phone: {
        country_code: client.phone.country_code ?? undefined,
        area_code: client.phone.area_code ?? undefined,
        number: client.phone.number ?? undefined,
        description: client.phone.description ?? undefined,
      },
    }),
    ...(client.residence && {
      residence: {
        state_id: client.residence.state_id ?? undefined,
        county_id: client.residence.county_id ?? undefined,
        district_id: client.residence.district_id ?? undefined,
        neighborhood_id: client.residence.neighborhood_id ?? undefined,
        address: client.residence.address ?? undefined,
      },
    }),
    ...(client.notes != null && { notes: client.notes }),
  };
}

/**
 * Save an edited customer.
 *
 * **PUT, not PATCH.** This PATCHed the same path, which store-be reserves for
 * the status change — so every customer edit sent a full client body to an
 * endpoint whose only required field is `status`, and came back 422 on every
 * single save. The field update has always been the PUT.
 */
export function useUpdateClient(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, dto }: { clientId: string; dto: UpdateClientDto }) =>
      crossAppApi.put<Client>(crossAppOrgPath(orgId!, `/clients/${clientId}`), dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", orgId] });
    },
  });
}

/**
 * Activate / deactivate a customer.
 *
 * The path was right all along — `/clients/{id}/status`, the convention every
 * other resource in store-be follows — but clients was the one controller that
 * had not adopted it, so this hit no route and answered 403 from the gateway.
 * The backend moved to the convention rather than this moving off it.
 */
export function useUpdateClientStatus(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, status }: { clientId: string; status: number }) =>
      crossAppApi.patch<Client>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/status`),
        { status }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", orgId] });
    },
  });
}
