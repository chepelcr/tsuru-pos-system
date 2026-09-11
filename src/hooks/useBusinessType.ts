import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgFeatureVisibility } from "@/store/orgFeatureVisibility";
import type { BusinessType } from "@/types/organization";

/**
 * Vertical surfaces — available to EVERY organization (TSR-150, revised).
 *
 * This hook used to be a gate. The org's `business_type` was written into
 * `organization_modules` by the platform API, and this hook read that list and
 * failed CLOSED: a minisuper could not open Mesas, a restaurant could not track
 * pharmacy lots, and a salón could do neither. That drew the line in the wrong
 * place. A business type describes what a business mostly does — not what it is
 * ever allowed to do. A bakery that starts taking table orders should not have
 * to be reclassified (or call support) before the tab appears, and a feature
 * that works perfectly but is invisible to the org that needs it is broken in
 * the way that is hardest to notice.
 *
 * So every vertical is available to every org, and the business type keeps a
 * real but narrower job: EMPHASIS. `emphasises()` says which surfaces this kind
 * of business leads with, so the app can put Mesas in front of a restaurant
 * without hiding it from anyone else.
 *
 * An org that wants a quieter app hides surfaces itself, in its own visibility
 * settings (`useOrgFeatureVisibility`). That is a preference it sets and can
 * undo — never a capability withheld from it — which is why `hasVertical`
 * consults it but the answer is never "you cannot".
 */

/**
 * Business type → the verticals it leads with. Mirrors `BUSINESS_TYPE_EMPHASIS`
 * in management-be's `rbac-seed.ts`; it grants nothing on either side.
 */
const BUSINESS_TYPE_EMPHASIS: Record<string, string[]> = {
  general: [],
  minisuper: ["retail"],
  restaurant: ["restaurant"],
  bar: ["restaurant", "bar"],
  farmacia: ["retail", "pharmacy"],
  servicios: ["services"],
  ferreteria: ["hardware"],
  salon: ["appointments"],
  taller: ["workshop", "appointments"],
};

export interface UseBusinessTypeResult {
  businessType: BusinessType;
  isRetailSupplier: boolean;
  /** Descriptive label only — never gate on this; it grants nothing. */
  isPyme: boolean;
  /**
   * Is this surface shown? True for every vertical unless the ORG itself chose
   * to hide it. Never false because of the business type.
   */
  hasVertical: (module: string) => boolean;
  /** Does this business type lead with the surface? Use for ordering/promotion. */
  emphasises: (module: string) => boolean;
  isRestaurant: boolean;
  isBar: boolean;
  isRetail: boolean;
  isPharmacy: boolean;
  isServices: boolean;
  isHardware: boolean;
  hasAppointments: boolean;
  isWorkshop: boolean;
  /**
   * @deprecated Nothing should gate chain behaviour on this. Whether a document
   * needs a purchasing department and a registered delivery point depends on
   * the CUSTOMER being a retail chain — see `lib/chainClients` — not on our own
   * org carrying a flag.
   */
  isSupplier: boolean;
  /**
   * Kept for call sites that waited before rendering a gated surface. Nothing
   * is gated any more, so it is always true — a surface never has to wait for
   * permission data that cannot take it away.
   */
  isReady: boolean;
}

export function useBusinessType(): UseBusinessTypeResult {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const isHidden = useOrgFeatureVisibility((s) => s.isHidden);

  const businessType = (org?.businessType ?? "general") as BusinessType;

  const emphasises = useMemo(() => {
    const led = new Set(BUSINESS_TYPE_EMPHASIS[businessType] ?? []);
    return (module: string) => led.has(module);
  }, [businessType]);

  const hasVertical = useMemo(
    () => (module: string) => !isHidden(org?.id, module),
    [isHidden, org?.id],
  );

  return {
    businessType,
    isRetailSupplier: org?.isRetailSupplier ?? false,
    isPyme: org?.isPyme ?? false,
    hasVertical,
    emphasises,
    isRestaurant: hasVertical("restaurant"),
    isBar: hasVertical("bar"),
    isRetail: hasVertical("retail"),
    isPharmacy: hasVertical("pharmacy"),
    isServices: hasVertical("services"),
    isHardware: hasVertical("hardware"),
    hasAppointments: hasVertical("appointments"),
    isWorkshop: hasVertical("workshop"),
    isSupplier: hasVertical("b2b-supply"),
    isReady: true,
  };
}
