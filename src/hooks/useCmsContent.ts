import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgContentPath } from "@/lib/api";
import type { Page, SectionContentUpdate } from "@/types/cms";

/**
 * CMS content editor data hook (markets-api).
 *
 * Note: the dashboard's `use-cms-content.tsx` was a storefront-side *render*
 * helper (color/style getters). Here we host the **editor** fetch + save, which
 * the dashboard did inline in `ContentPage`. Cleaner and matches POS hook
 * conventions (CLAUDE.md §7).
 *
 * Org-scoped CMS routes are SINGULAR — use {@link orgContentPath} (NO
 * `/memberships/`). Token auto-injected by the `api` client; never raw `fetch`.
 *
 * TODO(verify-endpoint): `GET /pages?includeContent=true` and
 * `POST /content/bulk-all` reachability on markets-api from the POS app.
 */
export function useCmsContent(userId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient();

  const pagesQuery = useQuery({
    queryKey: ["pages-content", orgId],
    enabled: !!userId && !!orgId,
    queryFn: () =>
      api.get<Page[]>(
        orgContentPath(userId!, orgId!, "/pages?includeContent=true")
      ),
  });

  const saveContent = useMutation({
    mutationFn: (updates: SectionContentUpdate[]) =>
      api.post(orgContentPath(userId!, orgId!, "/content/bulk-all"), { updates }),
    onSuccess: () => {
      // Refetch content…
      qc.invalidateQueries({ queryKey: ["pages-content", orgId] });
      // …and invalidate the deployment queues — saving content produces a
      // pending pre-deployment, so the Deployments "pending" tab must refetch.
      qc.invalidateQueries({ queryKey: ["deployments", orgId] });
      qc.invalidateQueries({ queryKey: ["pre-deployments", orgId] });
    },
  });

  return { pagesQuery, saveContent };
}
