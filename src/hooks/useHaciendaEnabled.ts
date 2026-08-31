import { useEffect, useMemo } from "react";
import { useOrgConfigurations } from "./useOrgConfigurations";
import { useRegisteredOrganization } from "./useRegisteredOrganization";

/**
 * Is this org set up to issue Hacienda electronic documents?
 *
 * Two records have to line up before a single FE/TE can leave the POS:
 *   1. `registered-organization` — the fiscal identity (cédula, régimen,
 *      actividades económicas) the XML is signed for. This one is persisted
 *      for offline use; the POS checkout reads the economic activities from it.
 *   2. `configurations` — ATV/TRIBU-CR credentials plus the .p12 certificate.
 *      This one is NEVER persisted: it carries the certificate blob, its PIN
 *      and the ATV password (see `queryClient.ts`).
 *
 * Orgs that never complete both are perfectly legitimate users of the app —
 * régimen simplificado shops, internal/B2B operations, orgs still onboarding.
 * They cannot emit documents, so the electronic-invoicing surfaces are useless
 * to them and the manual-order flow is what they get instead
 * (`docs/MANUAL_ORDERS.md`).
 *
 * Because the credential record cannot be cached, the derived *answer* is
 * remembered instead: a single boolean per org, which leaks nothing. Offline,
 * that flag is what keeps the manual-order affordance from appearing in a
 * fully registered org's create menu.
 *
 * FAIL-CLOSED when nothing is known yet: `enabled` stays false until the
 * queries resolve or a remembered flag turns up.
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
  /** True when the answer came from the remembered flag, not a live fetch. */
  isFromCache: boolean;
}

/** `status` value the org-configurations service uses for an active record. */
const CONFIGURATION_STATUS_ACTIVE = 1;

const FLAG_PREFIX = "pos-hacienda-enabled:";

/** Last known answer for an org, or `null` when never resolved on this device. */
export function rememberedHaciendaEnabled(orgId: string | undefined): boolean | null {
  if (!orgId) return null;
  try {
    const raw = localStorage.getItem(`${FLAG_PREFIX}${orgId}`);
    return raw === null ? null : raw === "true";
  } catch {
    return null;
  }
}

export function rememberHaciendaEnabled(orgId: string, enabled: boolean): void {
  try {
    localStorage.setItem(`${FLAG_PREFIX}${orgId}`, String(enabled));
  } catch {
    // Storage unavailable — the hook just falls back to fail-closed offline.
  }
}

export function useHaciendaEnabled(orgId: string | undefined): HaciendaEnabledResult {
  const registeredQuery = useRegisteredOrganization(orgId);
  const configQuery = useOrgConfigurations(orgId);

  const registered = registeredQuery.data;
  const configuration = configQuery.data;
  const isLoading = registeredQuery.isLoading || configQuery.isLoading;
  // A query that errored (offline, 5xx) has no authoritative answer. It is NOT
  // the same as "resolved with nothing" — that distinction is why the two
  // hooks rethrow instead of returning null.
  const isUnresolved = registeredQuery.isError || configQuery.isError;

  const live = useMemo(() => {
    const hasCredentials =
      !!configuration &&
      configuration.status === CONFIGURATION_STATUS_ACTIVE &&
      !!configuration.username &&
      !!configuration.certificate;
    return { enabled: !!registered && hasCredentials, hasCredentials };
  }, [registered, configuration]);

  // Remember the resolved answer so an offline session can still tell a
  // registered org from an unregistered one.
  useEffect(() => {
    if (!orgId || isLoading || isUnresolved) return;
    rememberHaciendaEnabled(orgId, live.enabled);
  }, [orgId, isLoading, isUnresolved, live.enabled]);

  return useMemo(() => {
    if (isLoading || isUnresolved) {
      const remembered = rememberedHaciendaEnabled(orgId);
      if (remembered !== null) {
        return {
          enabled: remembered,
          isLoading: false,
          // Nothing more specific is knowable from a boolean; both "missing"
          // flags stay false so callers don't render a misleading reason.
          missingCredentials: false,
          missingFiscalInfo: false,
          isFromCache: true,
        };
      }
      return {
        enabled: false,
        isLoading: true,
        missingCredentials: false,
        missingFiscalInfo: false,
        isFromCache: false,
      };
    }

    return {
      enabled: live.enabled,
      isLoading: false,
      missingCredentials: !!registered && !live.hasCredentials,
      missingFiscalInfo: !registered,
      isFromCache: false,
    };
  }, [isLoading, isUnresolved, orgId, live, registered]);
}
