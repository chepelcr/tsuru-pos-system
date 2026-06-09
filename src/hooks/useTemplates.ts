import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, userPath } from "@/lib/api";
import type { Template } from "@/types";

/**
 * Storefront template gallery hook (markets-api).
 *
 * Two responsibilities:
 *   1. List the GLOBAL storefront templates (`GET /api/templates?activeOnly=true`).
 *      Templates are NOT org-scoped — the dashboard fetched them from a flat,
 *      unscoped path, so this goes through the bare `api` client with no
 *      org/user prefix (CLAUDE.md §2, migration 04 §5.0/§5B).
 *   2. Apply a template to the EXISTING org (re-clone storefront content +
 *      set `Organization.template_name`). The POS app already exposes onboarding
 *      step3 (`POST userPath(userId, /organizations/{org}/onboarding/step3)`),
 *      and re-applying post-onboarding is the same clone operation, so we reuse
 *      that route. `templateId === null` ⇒ Playground / "start from scratch".
 *
 * TODO(verify-endpoint): none of these endpoints are currently exercised by POS.
 * Confirm against markets-api:
 *   • GET  /api/templates?activeOnly=true            (global, no org scope, camelCase)
 *   • POST /api/users/{u}/organizations/{o}/onboarding/step3  { templateId, includeCategories }
 *     — verify whether re-applying post-onboarding uses this same step3 route or a
 *       distinct `cloneTemplateToExistingOrg` route, and what `templateId: null` does
 *       (blank storefront vs no-op).
 */
export function useTemplates() {
  const queryClient = useQueryClient();

  /** List active storefront templates (global). */
  const useTemplateList = (activeOnly: boolean = true) =>
    useQuery({
      queryKey: ["templates", { activeOnly }],
      queryFn: () =>
        api.get<Template[]>(`/api/templates?activeOnly=${activeOnly}`),
      staleTime: 5 * 60 * 1000,
    });

  /**
   * Apply a template to the existing org (re-clone content + set template_name).
   * `templateId === null` ⇒ Playground / start from scratch.
   *
   * On success invalidates the org list (template_name changed),
   * `pages-content` (storefront content was re-cloned) and the deployment
   * queries (a template apply produces pending changes).
   */
  const useApplyTemplate = (userId: string | undefined) =>
    useMutation({
      mutationFn: async ({
        orgId,
        templateId,
        includeCategories = false,
      }: {
        orgId: string;
        templateId: string | null;
        includeCategories?: boolean;
      }) => {
        if (!userId) {
          throw new Error("userId is required to apply a storefront template");
        }
        return api.post<unknown>(
          userPath(userId, `/organizations/${orgId}/onboarding/step3`),
          { templateId, includeCategories }
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
        queryClient.invalidateQueries({
          queryKey: ["pages-content", variables.orgId],
        });
        queryClient.invalidateQueries({
          queryKey: ["pre-deployments", variables.orgId],
        });
        queryClient.invalidateQueries({
          queryKey: ["deployments", variables.orgId],
        });
      },
    });

  return { useTemplateList, useApplyTemplate };
}
