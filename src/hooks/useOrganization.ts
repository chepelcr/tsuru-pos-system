import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, salesApi, userPath, orgPath, authOrgPath } from '@/lib/api';
import type { Organization } from '../types';

export type { Organization } from '../types';

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  token: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  role?: { id: string; name: string; displayName: string };
  inviter?: { id: string; email: string; firstName?: string; lastName?: string };
}

export interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status?: string;
  user?: { id: string; email: string; firstName?: string; lastName?: string };
  role?: { id: string; name: string; displayName: string };
}

interface CreateOrganizationData {
  name: string;
  slug: string;
  subdomain?: string;
  ownerId: string;
}

interface CompleteStep2Data {
  organizationId: string;
  userId: string;
  email?: string;
  phone?: string;
  address?: string;
  stateId?: number;
  countyId?: number;
  districtId?: number;
  neighborhoodId?: number;
}

interface CompleteStep3Data {
  organizationId: string;
  userId: string;
  templateId?: string;
  includeCategories?: boolean;
}

export function useOrganization() {
  const queryClient = useQueryClient();

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

  // ─── Org theme (org-configurations service) ──────────────────────────────
  // Dedicated read for the org's saved POS theme. Backed by the new endpoint
  // GET /organizations/{orgId}/configurations/theme which returns
  // `{ theme: string | null }` straight from the organization_settings.theme
  // column — independent of the Hacienda config (GET /configurations 404s
  // without a hacienda config and omits theme). Returns `{ theme: null }` on
  // 404 / empty so the theme card + ThemeContext can read it unconditionally.
  const useOrgTheme = (orgId: string | undefined) => {
    return useQuery({
      queryKey: ['org-theme', orgId],
      enabled: !!orgId,
      queryFn: async () => {
        try {
          const data = await salesApi.get<{ theme: string | null }>(
            authOrgPath(orgId!, '/configurations/theme')
          );
          return { theme: data?.theme ?? null };
        } catch {
          // 404 / empty → no saved theme yet.
          return { theme: null };
        }
      },
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

  // ─── Slug availability (public endpoint) ─────────────────────────────────
  // Memoized to prevent infinite loops when used in useEffect dependencies.
  const checkSlugAvailable = useCallback(async (slug: string): Promise<boolean> => {
    try {
      const data = await api.get<{ available: boolean }>(
        `/api/organizations/check-slug/${slug}`
      );
      return !!data.available;
    } catch {
      return false;
    }
  }, []);

  // ─── Onboarding / create ─────────────────────────────────────────────────

  // Create organization (Step 1 - draft)
  const createOrganization = useMutation({
    mutationFn: async (data: CreateOrganizationData) => {
      return api.post<Organization>(
        userPath(data.ownerId, '/organizations'),
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });

  // Complete onboarding step 2 (contact info)
  const completeOnboardingStep2 = useMutation({
    mutationFn: async (data: CompleteStep2Data) => {
      const { organizationId, userId, ...contactSettings } = data;
      return api.post<Organization>(
        userPath(userId, `/organizations/${organizationId}/onboarding/step2`),
        contactSettings
      );
    },
    // Don't invalidate during onboarding - wait until completion
  });

  // Complete onboarding step 3 (apply template)
  const completeOnboardingStep3 = useMutation({
    mutationFn: async (data: CompleteStep3Data) => {
      const { organizationId, userId, templateId, includeCategories } = data;
      return api.post<Organization>(
        userPath(userId, `/organizations/${organizationId}/onboarding/step3`),
        { templateId, includeCategories }
      );
    },
    // Invalidate only after final step completes
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });

  // ─── Members ─────────────────────────────────────────────────────────────

  const useOrgMembers = (userId: string | undefined, orgId: string | undefined) => {
    return useQuery({
      queryKey: ['org-members', userId, orgId],
      queryFn: async () => {
        if (!userId || !orgId) return [];
        return api.get<OrgMember[]>(orgPath(userId, orgId, '/members'));
      },
      enabled: !!userId && !!orgId,
    });
  };

  // ─── Invitations ─────────────────────────────────────────────────────────

  const useOrgInvitations = (userId: string | undefined, orgId: string | undefined) => {
    return useQuery({
      queryKey: ['org-invitations', userId, orgId],
      queryFn: async () => {
        if (!userId || !orgId) return [];
        return api.get<Invitation[]>(orgPath(userId, orgId, '/invitations'));
      },
      enabled: !!userId && !!orgId,
    });
  };

  // Send invitation
  const inviteMember = useMutation({
    mutationFn: async (data: { userId: string; orgId: string; email: string; roleId: string }) => {
      return api.post<Invitation>(
        orgPath(data.userId, data.orgId, '/invitations'),
        {
          organizationId: data.orgId,
          email: data.email,
          roleId: data.roleId,
          invitedBy: data.userId,
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['org-invitations', variables.userId, variables.orgId],
      });
    },
  });

  // Cancel invitation
  const cancelInvitation = useMutation({
    mutationFn: async ({
      userId,
      orgId,
      invitationId,
    }: {
      userId: string;
      orgId: string;
      invitationId: string;
    }) => {
      return api.delete(orgPath(userId, orgId, `/invitations/${invitationId}`));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['org-invitations', variables.userId, variables.orgId],
      });
    },
  });

  // Resend invitation
  const resendInvitation = useMutation({
    mutationFn: async ({
      userId,
      orgId,
      invitationId,
    }: {
      userId: string;
      orgId: string;
      invitationId: string;
    }) => {
      return api.post(
        orgPath(userId, orgId, `/invitations/${invitationId}/resend`),
        {}
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['org-invitations', variables.userId, variables.orgId],
      });
    },
  });

  // ─── Theme update ──────────────────────────────────────────────────────
  // Persists the org's selected POS theme on the org-configurations Lambda
  // (sales-api gateway), NOT the markets-api.
  //
  // PATCH /organizations/{orgId}/configurations/theme accepts the scalar
  // `theme` (the POS shell theme id) and stores it alongside the org's other
  // configurations. Mirrors `useSaveOrgConfigurations` — invalidates the
  // ["org-configurations", orgId] query so the active theme (now read from the
  // config, not org.theme) re-resolves.
  const useUpdateOrgTheme = () => {
    return useMutation({
      mutationFn: async ({ orgId, theme }: { orgId: string; theme: string }) => {
        return salesApi.patch(
          authOrgPath(orgId, '/configurations/theme'),
          { theme }
        );
      },
      onSuccess: (_, { orgId }) => {
        queryClient.invalidateQueries({ queryKey: ['org-configurations', orgId] });
        queryClient.invalidateQueries({ queryKey: ['org-theme', orgId] });
      },
    });
  };

  return {
    // Queries
    useUserOrganizations,
    useDefaultOrganization,
    useOrgTheme,
    useOrgMembers,
    useOrgInvitations,

    // Checks
    checkSlugAvailable,

    // Mutations
    createOrganization,
    completeOnboardingStep2,
    completeOnboardingStep3,
    inviteMember,
    cancelInvitation,
    resendInvitation,
    useUpdateOrgTheme,
  };
}
