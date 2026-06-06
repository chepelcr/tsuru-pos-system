import { QueryClient, type Query } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { CATALOG_GC_TIME } from "@/hooks/useDataApi";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false, // Don't retry on error so we see errors immediately
      refetchOnWindowFocus: false,
      throwOnError: false, // Don't throw errors to error boundary, handle in components
    },
  },
});

/**
 * Exhaustive set of React Query key prefixes that are considered "catalog"
 * data — slow-changing Hacienda reference data backed by `useAll*` hooks in
 * `src/hooks/useDataApi.ts`. Only queries whose `queryKey[0]` matches one
 * of these prefixes are dehydrated to localStorage. Search results, single-
 * item lookups, and org-scoped business data stay in-memory only.
 *
 * Exported so `useCatalogInvalidationFeed` can reuse the same source of
 * truth when validating incoming invalidation payloads.
 */
export const CATALOG_QUERY_KEY_PREFIXES: ReadonlySet<string> = new Set([
  "codes",
  "customerTypes",
  "discountTypes",
  "documentTypes",
  "economicActivities",
  "exemptions",
  "exemptionIssuingInstitutions",
  "factoryTaxCharges",
  "identifications",
  "measurementUnits",
  "nationalTaxpayerCompanies",
  "nationalTaxpayerSpecialFields",
  "notificationCodes",
  "otherCharges",
  "payments",
  "pharmaceuticalForms",
  "productTypes",
  "referenceCodes",
  "references",
  "regimes",
  "saleConditions",
  "taxAmounts",
  "taxConditions",
  "taxFactors",
  "taxRateCodes",
  "taxRates",
  "taxes",
  "documentVersions",
]);

const PERSIST_STORAGE_KEY = "pos-system-rq-cache";

// SSR-safe guard: only wire localStorage persistence in the browser.
if (typeof window !== "undefined") {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: PERSIST_STORAGE_KEY,
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: CATALOG_GC_TIME,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) => {
        const head = query.queryKey?.[0];
        return typeof head === "string" && CATALOG_QUERY_KEY_PREFIXES.has(head);
      },
    },
  });
}
