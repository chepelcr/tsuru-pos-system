import { useQuery } from '@tanstack/react-query';
import { api, userPath } from '@/lib/api';
import type { Organization } from '../types';

export type { Organization } from '../types';

export function useOrganization() {
  // Get user's organizations (same endpoint as dashboard)
  const useUserOrganizations = (userId: string | undefined) => {
    return useQuery({
      queryKey: ['user-organizations', userId],
      queryFn: async () => {
        if (!userId) return [];
        return api.get<Organization[]>(
          userPath(userId, '/memberships/organizations')
        );
      },
      enabled: !!userId,
      staleTime: Infinity, // org list never goes stale — invalidated only on mutations
      gcTime: Infinity,
    });
  };

  // Get the currently selected organization.
  // Shares the same cache as useUserOrganizations (same query key).
  // Returns the org stored in sessionStorage['selectedOrgId'], or the first org when there's just one.
  const useDefaultOrganization = (userId: string | undefined) => {
    return useQuery({
      queryKey: ['user-organizations', userId],
      queryFn: async () => {
        if (!userId) return [];
        return api.get<Organization[]>(
          userPath(userId, '/memberships/organizations')
        );
      },
      select: (orgs) => {
        const selectedId = sessionStorage.getItem('selectedOrgId');
        if (selectedId) {
          return orgs.find((o) => o.id === selectedId) ?? orgs[0] ?? null;
        }
        return orgs[0] ?? null;
      },
      enabled: !!userId,
      staleTime: Infinity, // org list never goes stale — invalidated only on mutations
      gcTime: Infinity,
    });
  };

  return {
    useUserOrganizations,
    useDefaultOrganization,
  };
}
