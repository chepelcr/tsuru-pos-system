import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crossAppApi, crossAppOrgPath, ordersApi, ordersOrgPath } from '@/lib/api';

/**
 * Hooks for the vertical modules (TSR-154/158/159/161/162).
 *
 * Every one is `enabled` on its own module flag being resolved by the caller —
 * they are not self-gating, because gating belongs at the surface that renders,
 * not at the fetch. See `useBusinessType`.
 */

// ─── Restaurant: combos ─────────────────────────────────────────────────────

export interface ComboItem {
  combo_item_id: string;
  product_id: string;
  description?: string | null;
  /** Catalog price of one component, used to distribute the combo discount. */
  unit_price?: number | null;
  quantity: number;
  sort_order: number;
}

export interface Combo {
  combo_product_id: string;
  /** The combo's OWN price — never the sum of its parts. */
  price?: number | null;
  items: ComboItem[];
}

export function useCombo(orgId?: string, productId?: string, enabled = true) {
  return useQuery({
    queryKey: ['combo', orgId, productId],
    enabled: !!orgId && !!productId && enabled,
    staleTime: 60_000,
    queryFn: () =>
      ordersApi.get<Combo>(ordersOrgPath(orgId!, `/products/${productId}/combo`)),
  });
}

// ─── Restaurant: modifiers ──────────────────────────────────────────────────

export interface Modifier {
  modifier_id: string;
  name: string;
  price_delta: number;
  /** When set, this option becomes its own cart line with its own tax. */
  product_id?: string | null;
  sort_order: number;
}

export interface ModifierGroup {
  group_id: string;
  organization_id: string;
  name: string;
  min_select: number;
  max_select?: number | null;
  required: boolean;
  sort_order: number;
  modifiers: Modifier[];
}

export function useModifierGroups(orgId?: string, enabled = true) {
  return useQuery({
    queryKey: ['modifier-groups', orgId],
    enabled: !!orgId && enabled,
    staleTime: 60_000,
    queryFn: () =>
      crossAppApi.get<{ data: ModifierGroup[] }>(crossAppOrgPath(orgId!, '/modifier-groups')),
  });
}

export function useProductModifierGroups(orgId?: string, productId?: string, enabled = true) {
  return useQuery({
    queryKey: ['product-modifier-groups', orgId, productId],
    enabled: !!orgId && !!productId && enabled,
    staleTime: 60_000,
    queryFn: () =>
      crossAppApi.get<{ data: ModifierGroup[] }>(
        crossAppOrgPath(orgId!, `/products/${productId}/modifier-groups`),
      ),
  });
}

/**
 * Is a modifier selection complete enough to commit the line?
 *
 * Enforced before add-to-cart rather than at checkout: discovering "you must
 * choose a cooking point" three screens later is the wrong place to find out.
 */
export function validateModifierSelection(
  group: ModifierGroup,
  selectedIds: string[],
): string | null {
  const n = selectedIds.length;
  if (group.required && n === 0) return group.name;
  if (n < (group.min_select ?? 0)) return group.name;
  if (group.max_select != null && n > group.max_select) return group.name;
  return null;
}

// ─── Bar: price schedules ───────────────────────────────────────────────────

export interface PriceSchedule {
  schedule_id: string;
  name: string;
  days_of_week?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  priority: number;
  items: {
    item_id: string;
    product_id?: string | null;
    category_id?: string | null;
    price?: number | null;
    discount_percent?: number | null;
  }[];
}

export function usePriceSchedules(orgId?: string, enabled = true) {
  return useQuery({
    queryKey: ['price-schedules', orgId],
    enabled: !!orgId && enabled,
    staleTime: 60_000,
    queryFn: () =>
      crossAppApi.get<{ data: PriceSchedule[] }>(crossAppOrgPath(orgId!, '/price-schedules')),
  });
}

// ─── Farmacia: lots ─────────────────────────────────────────────────────────

export interface ProductLot {
  lot_id: string;
  product_id: string;
  lot_code: string;
  expires_on?: string | null;
  quantity: number;
}

export function useProductLots(orgId?: string, productId?: string, enabled = true) {
  return useQuery({
    queryKey: ['product-lots', orgId, productId],
    enabled: !!orgId && !!productId && enabled,
    staleTime: 30_000,
    queryFn: () =>
      crossAppApi.get<{ data: ProductLot[] }>(
        crossAppOrgPath(orgId!, `/products/${productId}/lots`),
      ),
  });
}

// ─── Agenda: appointments ───────────────────────────────────────────────────

export interface Appointment {
  appointment_id: string;
  branch_id?: string | null;
  client_id?: string | null;
  staff_user_id?: string | null;
  service_product_id?: string | null;
  /** Taller only — a salón books a person, a taller a person AND a vehicle. */
  asset_id?: string | null;
  starts_at: string;
  duration_minutes: number;
  appointment_status: string;
  notes?: string | null;
  converted_document_id?: string | null;
}

export function useAppointments(
  orgId?: string,
  range?: { from: string; to: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['appointments', orgId, range?.from, range?.to],
    enabled: !!orgId && !!range && enabled,
    staleTime: 15_000,
    queryFn: () =>
      crossAppApi.get<{ data: Appointment[] }>(
        crossAppOrgPath(orgId!, `/appointments?from=${range!.from}&to=${range!.to}`),
      ),
  });
}

export function useAppointmentMutations(orgId?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments', orgId] });

  const createAppointment = useMutation({
    mutationFn: (dto: Partial<Appointment>) =>
      crossAppApi.post<Appointment>(crossAppOrgPath(orgId!, '/appointments'), dto),
    onSuccess: invalidate,
  });

  const updateAppointment = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<Appointment> }) =>
      crossAppApi.patch<Appointment>(crossAppOrgPath(orgId!, `/appointments/${id}`), dto),
    onSuccess: invalidate,
  });

  return { createAppointment, updateAppointment };
}

// ─── Taller: client assets ──────────────────────────────────────────────────

export interface ClientAsset {
  asset_id: string;
  client_id: string;
  /** Placa or serie — whatever the shop uses to tell one asset from another. */
  identifier: string;
  kind?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  notes?: string | null;
}

export function useClientAssets(orgId?: string, clientId?: string, enabled = true) {
  return useQuery({
    queryKey: ['client-assets', orgId, clientId],
    enabled: !!orgId && !!clientId && enabled,
    staleTime: 30_000,
    queryFn: () =>
      crossAppApi.get<{ data: ClientAsset[] }>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/assets`),
      ),
  });
}

export function useClientAssetMutations(orgId?: string, clientId?: string) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['client-assets', orgId, clientId] });

  const createAsset = useMutation({
    mutationFn: (dto: Partial<ClientAsset>) =>
      crossAppApi.post<ClientAsset>(
        crossAppOrgPath(orgId!, `/clients/${clientId}/assets`),
        dto,
      ),
    onSuccess: invalidate,
  });

  return { createAsset };
}
