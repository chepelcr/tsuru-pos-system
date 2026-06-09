import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BranchTypeOption } from "@/types/branch";

/**
 * Per-org BRANCH TYPES catalog — replaces the old hardcoded `stand|restaurant`
 * enum. The catalog is managed in cross-app-be:
 *   GET    /api/organizations/{orgId}/branch-types
 *   POST   /api/organizations/{orgId}/branch-types
 *   PUT    /api/organizations/{orgId}/branch-types/{id}
 *   DELETE /api/organizations/{orgId}/branch-types/{id}
 *
 * TODO(verify-endpoint): the catalog endpoint is being added in cross-app-be.
 * Until it exists this query resolves to [] (the request error is swallowed) and
 * callers fall back to the built-in default options via {@link useBranchTypeOptions}.
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
      } catch {
        // Endpoint not available yet → fall back to defaults at the call site.
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
