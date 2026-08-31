import { useEffect, useMemo } from "react";
import { useOrgConfigurations } from "./useOrgConfigurations";
import { useRegisteredOrganization } from "./useRegisteredOrganization";

/**
 * What kind of documents can this organization produce?
 *
 * The discriminator is the **registered organization** — the fiscal identity
 * record (cédula, régimen, actividades económicas). Without it there is no
 * cédula to sign with and no activity code to put on a line, so no electronic
 * document can be built at all, let alone transmitted. An org in that state
 * uses the POS to record *pedidos* and nothing else.
 *
 * ATV/TRIBU-CR credentials are a separate, later step. An org that has fiscal
 * identity but has not finished wiring its certificate is not a different kind
 * of business — it is a registered taxpayer mid-setup. It keeps the electronic
 * document types; what it cannot do yet is *send* them, which is
 * `canTransmit`.
 *
 * ```
 *   registered-organization? ──no──▶  mode "orders-only"   (pedidos únicamente)
 *            │yes
 *            ▼
 *   credentials + certificate? ──no──▶ mode "electronic", canTransmit false
 *            │yes
 *            ▼
 *                                      mode "electronic", canTransmit true
 * ```
 *
 * Offline: `registered-organization` is persisted (see `queryClient.ts`), so
 * the mode survives a reload without a network. `configurations` is never
 * persisted — it holds the certificate, its PIN and the ATV password — so the
 * derived mode is remembered instead, as a single value that leaks nothing.
 */
export type FiscalMode = "loading" | "orders-only" | "electronic";

export interface FiscalModeResult {
  mode: FiscalMode;
  /** The org can only record manual orders — no electronic documents. */
  ordersOnly: boolean;
  /** The org has fiscal identity, so electronic documents are possible. */
  isElectronic: boolean;
  /** Identity AND active credentials — documents can actually reach Hacienda. */
  canTransmit: boolean;
  /** Registered, but the certificate/credentials are still missing. */
  missingCredentials: boolean;
  isLoading: boolean;
  /** True when the mode came from the remembered value, not a live fetch. */
  isFromCache: boolean;
}

/** `status` value the org-configurations service uses for an active record. */
const CONFIGURATION_STATUS_ACTIVE = 1;

const MODE_PREFIX = "pos-fiscal-mode:";

/** Last known mode for an org, or `null` when never resolved on this device. */
export function rememberedFiscalMode(orgId: string | undefined): FiscalMode | null {
  if (!orgId) return null;
  try {
    const raw = localStorage.getItem(`${MODE_PREFIX}${orgId}`);
    return raw === "electronic" || raw === "orders-only" ? raw : null;
  } catch {
    return null;
  }
}

export function rememberFiscalMode(orgId: string, mode: Exclude<FiscalMode, "loading">): void {
  try {
    localStorage.setItem(`${MODE_PREFIX}${orgId}`, mode);
  } catch {
    // Storage unavailable — the hook falls back to "loading" offline, which
    // shows neither document set rather than guessing the wrong one.
  }
}

export function useFiscalMode(orgId: string | undefined): FiscalModeResult {
  const registeredQuery = useRegisteredOrganization(orgId);
  const configQuery = useOrgConfigurations(orgId);

  const registered = registeredQuery.data;
  const configuration = configQuery.data;

  // Identity decides the mode, so only that query gates it. Credentials are
  // allowed to be unresolved: a POS with no signal still knows whether the org
  // is a taxpayer, and `canTransmit` is only consulted before sending.
  const identityUnknown = registeredQuery.isLoading || registeredQuery.isError;

  const hasCredentials =
    !!configuration &&
    configuration.status === CONFIGURATION_STATUS_ACTIVE &&
    !!configuration.username &&
    !!configuration.certificate;

  const liveMode: Exclude<FiscalMode, "loading"> | null = identityUnknown
    ? null
    : registered
      ? "electronic"
      : "orders-only";

  useEffect(() => {
    if (!orgId || liveMode === null) return;
    rememberFiscalMode(orgId, liveMode);
  }, [orgId, liveMode]);

  return useMemo(() => {
    // Fall back to the remembered mode only when identity is genuinely
    // unknown. Guessing here is worse than waiting: guessing "orders-only"
    // would let a taxpayer record off-book pedidos, and guessing "electronic"
    // would lock an unregistered org out of the only flow it has.
    const mode: FiscalMode = liveMode ?? rememberedFiscalMode(orgId) ?? "loading";

    return {
      mode,
      ordersOnly: mode === "orders-only",
      isElectronic: mode === "electronic",
      canTransmit: mode === "electronic" && hasCredentials,
      missingCredentials: mode === "electronic" && !configQuery.isLoading && !hasCredentials,
      isLoading: mode === "loading",
      isFromCache: liveMode === null && mode !== "loading",
    };
  }, [liveMode, orgId, hasCredentials, configQuery.isLoading]);
}
