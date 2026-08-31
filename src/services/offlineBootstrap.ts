import type { QueryClient } from "@tanstack/react-query";
import { ApiError, api, authOrgPath, salesApi, userPath } from "@/lib/api";
import { CATALOG_GC_TIME, CATALOG_STALE_TIME } from "@/hooks/useDataApi";
import { dataApiClient } from "@/services/data-api";
import { syncOfflineCatalog } from "@/services/offlineCatalog";
import { TaxTypeCode } from "@/lib/enums";
import type { Organization } from "@/types";
import type { RegisteredOrganization } from "@/types/registeredOrganization";
import type { TaxListResponse } from "@/services/data-api";

/**
 * First-login warm-up.
 *
 * The POS is used in places with bad connectivity, and half of its UI is
 * driven by Hacienda reference catalogs: identification types, tax types and
 * rates, measurement units, sale conditions, payment methods. Fetching those
 * lazily means the first cashier to open a line-detail drawer on a dead
 * connection gets empty selects and cannot finish the sale.
 *
 * So: pull everything once, right after login, while there IS a connection.
 * Reference catalogs land in the React Query cache (persisted to localStorage
 * by `queryClient.ts`), the org's own catalog lands in IndexedDB via
 * `offlineCatalog`, and both survive a reload.
 *
 * Every step uses the exact query key its hook uses — a mismatched key would
 * warm a cache entry nobody reads.
 */

// ─── Progress store (same shape as pendingSalesSync) ───────────────────────

export type OfflineBootstrapPhase = "idle" | "running" | "ready" | "error";

export interface OfflineBootstrapState {
  phase: OfflineBootstrapPhase;
  completed: number;
  total: number;
  /** Epoch ms of the last successful run for the active org. */
  lastCompletedAt: number | null;
  error: string | null;
}

const IDLE: OfflineBootstrapState = {
  phase: "idle",
  completed: 0,
  total: 0,
  lastCompletedAt: null,
  error: null,
};

let state: OfflineBootstrapState = IDLE;
const listeners = new Set<() => void>();

function publish(next: Partial<OfflineBootstrapState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeOfflineBootstrap(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineBootstrapState(): OfflineBootstrapState {
  return state;
}

// ─── Freshness stamp ───────────────────────────────────────────────────────

const STAMP_PREFIX = "pos-offline-bootstrap:";

/**
 * How long a warm-up counts as fresh. Matches the catalogs' own stale time:
 * re-running sooner would re-download data React Query still considers good.
 */
export const OFFLINE_BOOTSTRAP_TTL = CATALOG_STALE_TIME;

function stampKey(orgId: string) {
  return `${STAMP_PREFIX}${orgId}`;
}

export function offlineBootstrapCompletedAt(orgId: string): number | null {
  try {
    const raw = localStorage.getItem(stampKey(orgId));
    return raw ? Number(raw) || null : null;
  } catch {
    // Private mode / disabled storage — treat as never run.
    return null;
  }
}

function stampCompleted(orgId: string) {
  try {
    localStorage.setItem(stampKey(orgId), String(Date.now()));
  } catch {
    // Non-fatal: the warm-up just runs again next session.
  }
}

/** True on first login for this org, or once the previous warm-up went stale. */
export function shouldRunOfflineBootstrap(orgId: string): boolean {
  const completedAt = offlineBootstrapCompletedAt(orgId);
  return completedAt === null || Date.now() - completedAt > OFFLINE_BOOTSTRAP_TTL;
}

// ─── Steps ─────────────────────────────────────────────────────────────────

interface BootstrapStep {
  /** Stable id, used in the failure message and in tests. */
  id: string;
  run: () => Promise<unknown>;
}

export interface OfflineBootstrapDeps {
  queryClient: QueryClient;
  orgId: string;
  userId: string;
  /** ISO numeric country code the catalogs are scoped to ("188" for CR). */
  isoCode: string;
}

/** Tax types whose lines need a `tax_amount_id` (CLAUDE.md §8). */
const SPECIAL_AMOUNT_TAX_CODES: readonly string[] = [
  TaxTypeCode.IUC,
  TaxTypeCode.ISEBA,
  TaxTypeCode.ISEBEC,
  TaxTypeCode.IPT,
];

/**
 * Params for endpoints whose DTO requires `document_version_id`.
 *
 * The singleton `dataApiClient` injects it from DocumentVersionContext, so
 * every call site in the app passes only `iso_code` and casts. Mirrored here
 * rather than inventing a value the client would immediately overwrite.
 */
function versioned<P>(iso: { iso_code: string }): P {
  return iso as unknown as P;
}

function catalogStep(
  queryClient: QueryClient,
  id: string,
  queryKey: readonly unknown[],
  queryFn: () => Promise<unknown>,
): BootstrapStep {
  return {
    id,
    run: () =>
      queryClient.fetchQuery({
        queryKey,
        queryFn,
        staleTime: CATALOG_STALE_TIME,
        gcTime: CATALOG_GC_TIME,
      }),
  };
}

/**
 * The warm-up plan.
 *
 * Keys mirror `useDataApi` exactly (`[name, params]`), and the params objects
 * match what the real call sites pass — React Query hashes them structurally,
 * so `{ iso_code }` here and `{ iso_code }` there are the same entry.
 */
export function buildBootstrapSteps({
  queryClient,
  orgId,
  userId,
  isoCode,
}: OfflineBootstrapDeps): BootstrapStep[] {
  const iso = { iso_code: isoCode };
  const c = (id: string, key: readonly unknown[], fn: () => Promise<unknown>) =>
    catalogStep(queryClient, id, key, fn);

  return [
    // ── Hacienda reference catalogs ────────────────────────────────────────
    c("taxes", ["taxes", iso], () => dataApiClient.getAllTaxes(iso)),
    c("taxRates", ["taxRates", iso], () => dataApiClient.getAllTaxRates(iso)),
    c("taxFactors", ["taxFactors", iso], () => dataApiClient.getAllTaxFactors(iso)),
    c("factoryTaxCharges", ["factoryTaxCharges", iso], () =>
      dataApiClient.getAllFactoryTaxCharges(versioned(iso))),
    c("discountTypes", ["discountTypes", iso], () => dataApiClient.getAllDiscountTypes(iso)),
    c("identifications", ["identifications", iso], () =>
      dataApiClient.getAllIdentifications(iso)),
    c("codes", ["codes", iso], () => dataApiClient.getAllCodes(versioned(iso))),
    c("references", ["references", iso], () => dataApiClient.getAllReferences(versioned(iso))),
    c("referenceCodes", ["referenceCodes", iso], () => dataApiClient.getAllReferenceCodes(versioned(iso))),
    // `versioned(...)` below marks the endpoints whose document version the
    // client injects — the caller waits for it before bootstrapping.
    c("saleConditions", ["saleConditions", iso], () =>
      dataApiClient.getAllSaleConditions(versioned(iso))),
    c("payments", ["payments", iso], () =>
      dataApiClient.getAllPayments(versioned(iso))),
    c("otherCharges", ["otherCharges", iso], () => dataApiClient.getAllOtherCharges(versioned(iso))),
    c("economicActivities", ["economicActivities", iso], () =>
      dataApiClient.getAllEconomicActivities(iso)),

    // Parameterless catalogs — the hooks call them with no argument, so the
    // key's second element is `undefined`. It has to be passed explicitly.
    c("customerTypes", ["customerTypes", undefined], () => dataApiClient.getAllCustomerTypes()),
    c("measurementUnits", ["measurementUnits", undefined], () =>
      dataApiClient.getAllMeasurementUnits()),
    c("productTypes", ["productTypes", undefined], () => dataApiClient.getAllProductTypes()),
    c("currencies", ["currencies"], () => dataApiClient.getAllCurrencies()),

    // Countries are read both ways across the app; warm both entries.
    c("countries", ["countries", undefined], () => dataApiClient.getAllCountries()),
    c("countriesActive", ["countries", { status: "1" }], () =>
      dataApiClient.getAllCountries({ status: "1" })),
    c("states", ["states", isoCode], () => dataApiClient.getStates({ iso_code: isoCode })),

    // ── Tax amounts, one call per special-amount tax type ─────────────────
    {
      id: "taxAmounts",
      run: async () => {
        const taxes = queryClient.getQueryData<TaxListResponse>(["taxes", iso]) ?? [];
        const special = taxes.filter((tax) => SPECIAL_AMOUNT_TAX_CODES.includes(tax.code));
        for (const tax of special) {
          const params = { iso_code: isoCode, tax_id: tax.id };
          await queryClient.fetchQuery({
            queryKey: ["taxAmounts", params],
            queryFn: () => dataApiClient.getAllTaxAmounts(params),
            staleTime: CATALOG_STALE_TIME,
            gcTime: CATALOG_GC_TIME,
          });
        }
        return special.length;
      },
    },

    // ── Account context ───────────────────────────────────────────────────
    {
      id: "organizations",
      run: () =>
        queryClient.fetchQuery({
          queryKey: ["user-organizations", userId],
          queryFn: () => api.get<Organization[]>(userPath(userId, "/memberships/organizations")),
          staleTime: Infinity,
          gcTime: Infinity,
        }),
    },
    {
      // The org's fiscal identity. Warmed explicitly because the POS checkout
      // reads the org's ECONOMIC ACTIVITIES from it to fill `activity_code`,
      // and a sale cannot be completed without one. Persisted by the query
      // client, unlike the ATV credentials next to it.
      id: "registeredOrganization",
      run: () =>
        queryClient.fetchQuery({
          queryKey: ["registered-organization", orgId],
          queryFn: async () => {
            try {
              return await salesApi.get<RegisteredOrganization>(
                authOrgPath(orgId, "/registered-organization"),
              );
            } catch (error) {
              // Mirror the hook: no fiscal info yet is an answer, not a
              // failure. Letting a 404 fail the step would leave the whole
              // warm-up unstamped and re-running every session.
              if (error instanceof ApiError && error.status === 404) return null;
              throw error;
            }
          },
          staleTime: 5 * 60_000,
          gcTime: 10 * 60_000,
        }),
    },

    // ── The org's own catalog → IndexedDB ─────────────────────────────────
    { id: "orgCatalog", run: () => syncOfflineCatalog(orgId) },
  ];
}

// ─── Runner ────────────────────────────────────────────────────────────────

let active: Promise<void> | null = null;

/**
 * Run the warm-up. Concurrent calls share one run; a step that fails does not
 * abort the rest — partial offline coverage beats none, and the stamp is only
 * written when every step succeeded so the next session retries.
 */
export function runOfflineBootstrap(deps: OfflineBootstrapDeps): Promise<void> {
  if (active) return active;

  const steps = buildBootstrapSteps(deps);
  publish({ phase: "running", completed: 0, total: steps.length, error: null });

  active = (async () => {
    let failed = 0;
    let lastError: string | null = null;

    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        failed += 1;
        lastError = `${step.id}: ${error instanceof Error ? error.message : "failed"}`;
      }
      publish({ completed: state.completed + 1 });
    }

    if (failed === 0) {
      stampCompleted(deps.orgId);
      publish({ phase: "ready", lastCompletedAt: Date.now(), error: null });
    } else {
      publish({ phase: "error", error: lastError });
    }
  })().finally(() => {
    active = null;
  });

  return active;
}

/** Forget the freshness stamp so the next mount warms up again. */
export function resetOfflineBootstrap(orgId: string) {
  try {
    localStorage.removeItem(stampKey(orgId));
  } catch {
    // Nothing to reset when storage is unavailable.
  }
  publish(IDLE);
}
