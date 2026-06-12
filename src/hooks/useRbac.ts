import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgRbacPath } from "@/lib/api";
import { DOCUMENT_TYPES } from "@/types/invoice";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import type {
  AvailableMatrixDto,
  MyPermissionsDto,
  PermissionGrantDto,
  RoleDto,
} from "@/types/rbac";

/**
 * Org-scoped RBAC hooks (markets-api `/api/users/{u}/organization/{o}/rbac/*`).
 *
 * Contract: docs/roadmap/rbac_express_contract.md (endpoints O1–O11).
 * Query keys follow the contract's FE notes:
 *   ["rbac","my-permissions",orgId] · ["rbac","matrix",orgId]
 *   ["rbac","roles",orgId]          · ["rbac","role-permissions",orgId,roleId]
 */

// ─── Queries ────────────────────────────────────────────────────────────────

/** O1 — caller's effective permissions in the org (nav/action gating). */
export function useMyPermissions(
  userId: string | undefined,
  orgId: string | undefined
) {
  return useQuery({
    queryKey: ["rbac", "my-permissions", orgId],
    queryFn: () =>
      api.get<MyPermissionsDto>(orgRbacPath(userId!, orgId!, "/my-permissions")),
    enabled: !!userId && !!orgId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** O2 — org-filtered modules → submodules → grantable actions (matrix UI). */
export function useAvailableMatrix(
  userId: string | undefined,
  orgId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["rbac", "matrix", orgId],
    queryFn: () =>
      api.get<AvailableMatrixDto>(
        orgRbacPath(userId!, orgId!, "/available-matrix")
      ),
    enabled: !!userId && !!orgId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

/** O4 — org roles + system role templates (platform_admin excluded server-side). */
export function useOrgRoles(
  userId: string | undefined,
  orgId: string | undefined
) {
  return useQuery({
    queryKey: ["rbac", "roles", orgId],
    queryFn: () =>
      api.get<RoleDto[]>(orgRbacPath(userId!, orgId!, "/roles/organization")),
    enabled: !!userId && !!orgId,
  });
}

/** O9 — grant rows of one role (org role or system template). */
export function useRolePermissions(
  userId: string | undefined,
  orgId: string | undefined,
  roleId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["rbac", "role-permissions", orgId, roleId],
    queryFn: () =>
      api.get<PermissionGrantDto[]>(
        orgRbacPath(userId!, orgId!, `/roles/${roleId}/permissions`)
      ),
    enabled: !!userId && !!orgId && !!roleId && (options?.enabled ?? true),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export interface CreateRoleInput {
  userId: string;
  orgId: string;
  name: string;
  displayName?: string;
  description?: string;
}

/** O6 — create org role (organizationId forced from path server-side). */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, ...body }: CreateRoleInput) =>
      api.post<RoleDto>(orgRbacPath(userId, orgId, "/roles"), body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rbac", "roles", variables.orgId],
      });
    },
  });
}

export interface UpdateRoleInput {
  userId: string;
  orgId: string;
  roleId: string;
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
}

/** O7 — update org role (404 cross-org, 400 system roles). */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, roleId, ...body }: UpdateRoleInput) =>
      api.put<RoleDto>(orgRbacPath(userId, orgId, `/roles/${roleId}`), body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rbac", "roles", variables.orgId],
      });
    },
  });
}

/** O8 — delete org role (409 when referenced by organization_members). */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      orgId,
      roleId,
    }: {
      userId: string;
      orgId: string;
      roleId: string;
    }) => api.delete<{ message: string }>(orgRbacPath(userId, orgId, `/roles/${roleId}`)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rbac", "roles", variables.orgId],
      });
    },
  });
}

export interface SetRolePermissionsInput {
  userId: string;
  orgId: string;
  roleId: string;
  permissions: PermissionGrantDto[];
}

/** O10 — bulk replace a role's permission set (subset-validated server-side). */
export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, roleId, permissions }: SetRolePermissionsInput) =>
      api.put<{ message: string; count: number }>(
        orgRbacPath(userId, orgId, `/roles/${roleId}/permissions`),
        { permissions }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rbac", "role-permissions", variables.orgId, variables.roleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["rbac", "my-permissions", variables.orgId],
      });
    },
  });
}

export interface AssignMemberRoleInput {
  userId: string;
  orgId: string;
  memberId: string;
  roleId: string;
}

/** O11 — assign a role to an organization member (same-org rule V3 server-side). */
export function useAssignMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, memberId, roleId }: AssignMemberRoleInput) =>
      api.put(orgRbacPath(userId, orgId, `/members/${memberId}/role`), { roleId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["org-members", variables.userId, variables.orgId],
      });
      queryClient.invalidateQueries({
        queryKey: ["rbac", "my-permissions", variables.orgId],
      });
    },
  });
}

// ─── Permission gating helper ───────────────────────────────────────────────

export interface UsePermissionsResult {
  /**
   * `can(module, action, submodule?)` over the flattened
   * "module:submodule:action" strings. Module-wide grants are already
   * expanded per submodule by the backend, so an omitted `submodule`
   * matches ANY submodule of the module.
   */
  can: (module: string, action: string, submodule?: string) => boolean;
  /** Module-level nav gating (MyPermissionsDto.modules). */
  hasModule: (module: string) => boolean;
  modules: string[];
  isOwner: boolean;
  isAdmin: boolean;
  /** True once my-permissions resolved with data — gating only applies then. */
  isReady: boolean;
  isLoading: boolean;
  role: MyPermissionsDto["role"] | null;
}

/**
 * Nav/route gating hook backed by O1 `my-permissions`, cached via the shared
 * React Query key ["rbac","my-permissions",orgId] (same cache as
 * `useMyPermissions`, so dashboard mount + sidebar + pages share one fetch).
 *
 * Resolves userId from AuthContext and the active org from the persisted
 * default-organization query (works both inside and outside `OrgProvider`,
 * e.g. in `DashboardSidebar` while the org is still loading).
 *
 * FAIL-OPEN while the permission set is unknown (loading or request failed):
 * the backend ships with RBAC_ENFORCEMENT=log (contract §3.0.4), so the UI
 * must not lock users out before the endpoint is live. Once data arrives,
 * gating is enforced.
 */
export function usePermissions(): UsePermissionsResult {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const query = useMyPermissions(user?.userId, org?.id);

  const data = query.data;

  const can = useCallback(
    (module: string, action: string, submodule?: string): boolean => {
      if (!data) return true; // fail-open until permissions resolve
      if (data.isOwner) return true;
      if (submodule) {
        return data.permissions.includes(`${module}:${submodule}:${action}`);
      }
      return data.permissions.some((p) => {
        const [m, , a] = p.split(":");
        return m === module && a === action;
      });
    },
    [data]
  );

  const hasModule = useCallback(
    (module: string): boolean => {
      if (!data) return true; // fail-open until permissions resolve
      if (data.isOwner) return true;
      return data.modules.includes(module);
    },
    [data]
  );

  return {
    can,
    hasModule,
    modules: data?.modules ?? [],
    isOwner: data?.isOwner ?? false,
    isAdmin: data?.isAdmin ?? false,
    isReady: !!data,
    isLoading: query.isLoading,
    role: data?.role ?? null,
  };
}

/**
 * DOCUMENT_TYPES filtered to the ones the current role may CREATE — each doc
 * type maps to a `documents/<permSub>` submodule (sensitive types like credit/
 * debit notes are restricted per role; cashiers only get FE/TE). Fail-open
 * (all types) until my-permissions resolves, like the rest of the nav gating.
 */
export function useCreatableDocTypes() {
  const { can, isReady } = usePermissions();
  return useMemo(
    () =>
      DOCUMENT_TYPES.filter(
        (dt) => !isReady || can("documents", "create", dt.permSub)
      ),
    [can, isReady]
  );
}
