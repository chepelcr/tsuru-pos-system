import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, userPath, orgPath } from '@/lib/api';
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
  // Persists the org's selected POS theme on the markets-api.
  //
  // TODO(verify-endpoint): The dashboard persists theme as a settings object via
  // PUT /api/users/{u}/organization/{o}/settings/theme (ThemeSettingsController).
  // This task models `theme` as a scalar field on the Organization itself, for
  // which no dedicated PATCH route is confirmed. We PATCH the org via the
  // user-scoped org path (same shape onboarding step2/step3 use) with `{ theme }`.
  // Verify the real route/body shape against the markets-api before relying on it.
  const useUpdateOrgTheme = (userId: string | undefined) => {
    return useMutation({
      mutationFn: async ({ orgId, theme }: { orgId: string; theme: string }) => {
        if (!userId) throw new Error('userId is required to update the organization theme');
        return api.patch<Organization>(
          userPath(userId, `/organizations/${orgId}`),
          { theme }
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-organizations', userId] });
      },
    });
  };

  return {
    // Queries
    useUserOrganizations,
    useDefaultOrganization,
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
