import { useQuery } from "@tanstack/react-query";
import { ACTIVE_ONLY } from "@/lib/search";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import type { Session } from "@/types";

/**
 * The organization's currently open session, if any.
 *
 * Only the first active row is ever used, so this fetches ONE — not a hundred.
 * It also lives behind the dashboard shell, which wraps every page, so it is
 * cached generously and does not refetch on window focus: an earlier version
 * without those settings produced a refetch storm on `/sessions`.
 *
 * Extracted from `DashboardLayout` so the sidebar footer can render the live
 * badge without the layout prop-drilling it through the shell AND the mobile
 * drawer, which both render the sidebar. React Query dedupes on the shared key,
 * so two callers still cost one request.
 */
export function useActiveSession() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);

  const { data } = useQuery({
    queryKey: ["active-session", org?.id],
    enabled: !!org,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: () =>
      crossAppApi.get<{ data: Session[] }>(
        crossAppOrgPath(org!.id, `/sessions?page_size=1&search=${ACTIVE_ONLY}`),
      ),
  });

  return data?.data?.[0];
}
