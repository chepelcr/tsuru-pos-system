import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BranchTypeOption } from "@/types/branch";

/**
 * Per-org BRANCH TYPES catalog — replaces the old hardcoded `stand|restaurant`
 * enum. The catalog is managed in cross-app-be (store-be):
 *   GET    /api/organizations/{orgId}/branch-types
 *   POST   /api/organizations/{orgId}/branch-types
 *   PUT    /api/organizations/{orgId}/branch-types/{id}
 *   DELETE /api/organizations/{orgId}/branch-types/{id}
 *
 * An empty catalog is a legitimate answer (an org created before the catalog was
 * seeded), so callers fall back to the built-in default options via
 * {@link useBranchTypeOptions} rather than rendering an empty selector. A request
 * that actually fails is logged and treated the same way — a broken catalog fetch
 * must not take the branches page down with it.
 */
export function useBranchTypes(orgId: string | undefined) {
  return useQuery<BranchTypeOption[]>({
    queryKey: ["branch-types", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await crossAppApi.get<{ data?: BranchTypeOption[] } | BranchTypeOption[]>(
          crossAppOrgPath(orgId!, "/branch-types"),
        );
        return Array.isArray(res) ? res : res.data ?? [];
      } catch (error) {
        // Fall back to the defaults at the call site rather than failing the page.
        console.warn("[branch-types] catalog fetch failed, using defaults", error);
        return [];
      }
    },
  });
}

/**
 * The branch-type options to render in selectors/labels: the org's catalog when
 * present, otherwise the built-in default seed types (translated). Reads the
 * current org from OrgContext so callers don't have to thread `orgId`.
 */
export function useBranchTypeOptions(): BranchTypeOption[] {
  const { t } = useLanguage();
  const { orgId } = useOrgContext();
  const { data = [] } = useBranchTypes(orgId);
  if (data.length > 0) return data;
  return [
    { code: "stand", name: t("puestos.stand"), icon: "store", color: "primary" },
    { code: "restaurant", name: t("puestos.restaurant"), icon: "home", color: "info" },
  ];
}
