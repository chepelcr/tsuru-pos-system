import { useMemo } from "react";
import { useOrgConfigurations } from "./useOrgConfigurations";
import { useRegisteredOrganization } from "./useRegisteredOrganization";

/**
 * Is this org set up to issue Hacienda electronic documents?
 *
 * Two records have to line up before a single FE/TE can leave the POS:
 *   1. `registered-organization` — the fiscal identity (cédula, régimen,
 *      actividades económicas) the XML is signed for.
 *   2. `configurations` — ATV/TRIBU-CR credentials plus the .p12 certificate.
 *
 * Orgs that never complete both are perfectly legitimate users of the app —
 * régimen simplificado shops, internal/B2B operations, orgs still onboarding.
 * They cannot emit documents, so the electronic-invoicing surfaces are useless
 * to them and the manual-order flow is what they get instead
 * (`docs/MANUAL_ORDERS.md`).
 *
 * FAIL-CLOSED while loading: `enabled` stays false until both queries resolve,
 * mirroring `useProgramsEnabled`. Callers that gate a *destructive* or
 * *irreversible* affordance should wait on `isLoading` rather than reading a
 * transient `false`.
 */
export interface HaciendaEnabledResult {
  /** True only when fiscal identity AND active credentials both exist. */
  enabled: boolean;
  /** True while either underlying query is still resolving. */
  isLoading: boolean;
  /** The org has fiscal identity but no usable credentials yet. */
  missingCredentials: boolean;
  /** The org has no `registered-organization` record at all. */
  missingFiscalInfo: boolean;
}

/** `status` value the org-configurations service uses for an active record. */
const CONFIGURATION_STATUS_ACTIVE = 1;

export function useHaciendaEnabled(orgId: string | undefined): HaciendaEnabledResult {
  const { data: registered, isLoading: registeredLoading } = useRegisteredOrganization(orgId);
  const { data: configuration, isLoading: configLoading } = useOrgConfigurations(orgId);

  return useMemo(() => {
    const isLoading = registeredLoading || configLoading;
    const missingFiscalInfo = !isLoading && !registered;
    const hasCredentials =
      !!configuration &&
      configuration.status === CONFIGURATION_STATUS_ACTIVE &&
      !!configuration.username &&
      !!configuration.certificate;

    return {
      enabled: !isLoading && !!registered && hasCredentials,
      isLoading,
      missingCredentials: !isLoading && !!registered && !hasCredentials,
      missingFiscalInfo,
    };
  }, [registered, registeredLoading, configuration, configLoading]);
}
