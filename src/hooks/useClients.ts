import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";

// ─── Sub-types matching backend DTOs ──────────────────────────────────────

export interface PhoneValue {
  country_code?: string | null;
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

/** Formats a phone object (or undefined/null) to a display string. */
export function formatPhone(phone: PhoneValue | null | undefined): string {
  if (!phone) return "";
  const parts = [phone.area_code, phone.number].filter(Boolean);
  return parts.join("-") || "";
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
    queryFn: () =>
      crossAppApi.get<ClientListResponse>(
        crossAppOrgPath(orgId!, `/clients?${searchParam}${pageParam}${sizeParam}`)
      ),
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

export function useUpdateClient(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, dto }: { clientId: string; dto: UpdateClientDto }) =>
      crossAppApi.patch<Client>(crossAppOrgPath(orgId!, `/clients/${clientId}`), dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", orgId] });
    },
  });
}

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
