import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import type { BusinessType } from "@/types/organization";

/**
 * Vertical-feature gating driven by the organization's business type (TSR-150).
 *
 * The AUTHORITY is `organization_modules`, surfaced as `MyPermissionsDto.modules`
 * — the platform API writes it from the org's `business_type` + flags, so the
 * FE never re-derives the mapping (docs/roadmap/tsuru_plans_implementation.md
 * §3.1: "make the plan the writer, not a parallel system"). `businessType`
 * itself is returned only for COPY and labels, never as the gate.
 *
 * Why not `usePermissions().hasModule()`: that helper is part of the
 * RBAC_ENFORCEMENT=log rollout, so it fails OPEN while permissions load and
 * returns true for any owner. Both are right for a permission ("don't lock the
 * owner out of their own admin page") and wrong for a vertical — the owner of a
 * minisuper must not see the restaurant's Mesas tab, and neither should anyone
 * during the loading flicker. So this hook reads the module list directly and
 * fails CLOSED, mirroring `useProgramsEnabled`.
 */
export interface UseBusinessTypeResult {
  businessType: BusinessType;
  isRetailSupplier: boolean;
  /** Descriptive label only — never gate on this; it grants nothing. */
  isPyme: boolean;
  /** Fail-closed vertical-module check. */
  hasVertical: (module: string) => boolean;
  isRestaurant: boolean;
  isBar: boolean;
  isRetail: boolean;
  isPharmacy: boolean;
  isServices: boolean;
  isHardware: boolean;
  hasAppointments: boolean;
  isWorkshop: boolean;
  /** True when the org supplies a retail chain (departments, delivery points). */
  /**
   * @deprecated Nothing should gate chain behaviour on this. Whether a document
   * needs a purchasing department and a registered delivery point depends on
   * the CUSTOMER being a retail chain — see `lib/chainClients` — not on our own
   * org carrying a flag. Kept only because the `b2b-supply` vertical still
   * governs which modules the org can see.
   */
  isSupplier: boolean;
  /** True once the module list resolved — gating is meaningful only then. */
  isReady: boolean;
}

export function useBusinessType(): UseBusinessTypeResult {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { modules, isReady } = usePermissions();

  const hasVertical = useMemo(() => {
    const owned = new Set(modules);
    // Fail closed: until the module list is known, no vertical surface renders.
    return (module: string) => (isReady ? owned.has(module) : false);
  }, [modules, isReady]);

  return {
    businessType: (org?.businessType ?? "general") as BusinessType,
    isRetailSupplier: org?.isRetailSupplier ?? false,
    isPyme: org?.isPyme ?? false,
    hasVertical,
    isRestaurant: hasVertical("restaurant"),
    isBar: hasVertical("bar"),
    isRetail: hasVertical("retail"),
    isPharmacy: hasVertical("pharmacy"),
    isServices: hasVertical("services"),
    isHardware: hasVertical("hardware"),
    hasAppointments: hasVertical("appointments"),
    isWorkshop: hasVertical("workshop"),
    isSupplier: hasVertical("b2b-supply"),
    isReady,
  };
}
