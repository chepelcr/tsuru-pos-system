import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, orgSettingsPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { emitPlanLimit } from "@/lib/planLimitBus";

/**
 * The organization's PLAN: limits, capabilities and live usage
 * (`GET …/organizations/:orgId/entitlements`, management-be). The plan is the
 * organization owner's.
 *
 * Mirrors `usePermissions()` but answers a different question: RBAC says whether
 * THIS USER may act; entitlements say whether the ORGANIZATION's plan has room.
 *
 * **Fails OPEN while unresolved** (spec §6.1): the backend is the authority and
 * refuses with 402 anyway, so the UI must never invent a restriction — hiding a
 * control the org is entitled to looks like the product is broken.
 */

export type LimitKey = "docs.per_month" | "products" | "customers" | "branches" | "terminals" | "team.seats";

export interface EntitlementsDto {
  plan_id: string;
  limits: Record<LimitKey, number | null>;
  capabilities: Record<string, boolean>;
  overridden: string[];
  usage: Record<LimitKey, number>;
  soft_limits: LimitKey[];
}

export interface PlanCatalogEntry {
  id: string;
  display_name: string;
  sort_order: number;
  price_monthly: number | null;
  price_annual: number | null;
  currency: string;
  is_custom_price: boolean;
  is_self_serve: boolean;
  entitlements: Record<string, number | boolean | null>;
}

export const ENTITLEMENTS_QUERY_KEY = "entitlements";

export interface LimitState {
  limit: number | null;
  used: number;
  remaining: number | null;
}

export function useEntitlements() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const userId = user?.userId;
  const orgId = org?.id;

  const query = useQuery({
    queryKey: [ENTITLEMENTS_QUERY_KEY, orgId],
    queryFn: () => api.get<EntitlementsDto>(orgSettingsPath(userId!, orgId!, "/entitlements")),
    enabled: !!userId && !!orgId,
    staleTime: 60 * 1000,
    retry: 1,
  });
  const data = query.data;

  const allows = useCallback((capability: string) => (data ? data.capabilities[capability] !== false : true), [data]);

  const limitOf = useCallback((key: LimitKey): LimitState => {
    if (!data) return { limit: null, used: 0, remaining: null };
    const limit = data.limits[key] ?? null;
    const used = data.usage[key] ?? 0;
    return { limit, used, remaining: limit === null ? null : Math.max(0, limit - used) };
  }, [data]);

  /** Hard limits only: a soft limit (documents) is never "at limit" for gating. */
  const atLimit = useCallback((key: LimitKey) => {
    if (!data || data.soft_limits.includes(key)) return false;
    const { limit, used } = limitOf(key);
    return limit !== null && used >= limit;
  }, [data, limitOf]);

  return useMemo(() => ({
    data,
    planId: data?.plan_id,
    allows,
    limitOf,
    atLimit,
    isReady: !!data,
    isLoading: query.isLoading,
    isError: query.isError,
  }), [data, allows, limitOf, atLimit, query.isLoading, query.isError]);
}

/** The public plan catalog, for prices and names in the upgrade sheet. */
export function usePlanCatalog(enabled = true) {
  return useQuery({
    queryKey: ["plan-catalog"],
    queryFn: () => api.get<PlanCatalogEntry[]>("/api/plans"),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Wrap a create action so a full plan opens the upgrade sheet instead of a form
 * the server will refuse (spec §6.2 — the button stays enabled, never dead).
 *
 *   const gate = useLimitGate();
 *   <Button onClick={gate("products", openNew)} />
 */
export function useLimitGate() {
  const { data, atLimit, limitOf } = useEntitlements();
  return useCallback(<A extends unknown[]>(key: LimitKey, action: (...args: A) => void) =>
    (...args: A) => {
      if (data && atLimit(key)) {
        const { limit, used } = limitOf(key);
        emitPlanLimit({ key, kind: "limit", limit, current: used, current_plan: data.plan_id, required_plan: null });
        return;
      }
      action(...args);
    }, [data, atLimit, limitOf]);
}

/** Same for a capability the plan does not include (e.g. custom roles). */
export function useCapabilityGate() {
  const { data, allows } = useEntitlements();
  return useCallback(<A extends unknown[]>(capability: string, action: (...args: A) => void) =>
    (...args: A) => {
      if (data && !allows(capability)) {
        emitPlanLimit({ key: capability, kind: "capability", limit: null, current: null, current_plan: data.plan_id, required_plan: null });
        return;
      }
      action(...args);
    }, [data, allows]);
}
