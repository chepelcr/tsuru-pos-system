import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgRbacPath } from "@/lib/api";
import {
  DOCUMENT_TYPES,
  MANUAL_ORDER_DOC_TYPE,
  MANUAL_ORDER_DOCUMENT_TYPE,
} from "@/types/invoice";
import type { EditorDocumentTypeInfo } from "@/types/invoice";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useFiscalMode } from "@/hooks/useFiscalMode";
import type {
  AvailableMatrixDto,
  MyPermissionsDto,
  PermissionGrantDto,
  RoleDto,
  RoleSummaryDto,
} from "@/types/rbac";

/**
 * Org-scoped RBAC hooks (markets-api `/api/users/{u}/organizations/{o}/rbac/*`).
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
  display_name?: string;
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
  display_name?: string;
  description?: string;
  is_active?: boolean;
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
      api.put(orgRbacPath(userId, orgId, `/members/${memberId}/role`), { role_id: roleId }),
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

// ─── Multiple roles per member (O16–O19, TSR-330) ───────────────────────────

/** Roles assigned to a member (the active one included). */
export function useMemberRoles(
  userId: string | undefined,
  orgId: string | undefined,
  memberId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["rbac", "member-roles", orgId, memberId],
    queryFn: () =>
      api.get<RoleSummaryDto[]>(orgRbacPath(userId!, orgId!, `/members/${memberId}/roles`)),
    enabled: !!userId && !!orgId && !!memberId && (options?.enabled ?? true),
  });
}

interface MemberRoleMutationInput {
  userId: string;
  orgId: string;
  memberId: string;
  roleId: string;
}

function invalidateMemberRoleQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  v: { userId: string; orgId: string; memberId?: string }
) {
  queryClient.invalidateQueries({ queryKey: ["org-members", v.userId, v.orgId] });
  queryClient.invalidateQueries({ queryKey: ["rbac", "member-roles", v.orgId] });
  queryClient.invalidateQueries({ queryKey: ["rbac", "my-permissions", v.orgId] });
}

/** Grant an extra role to a member. Their active role is unchanged. */
export function useAddMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, memberId, roleId }: MemberRoleMutationInput) =>
      api.post<RoleSummaryDto[]>(orgRbacPath(userId, orgId, `/members/${memberId}/roles`), {
        role_id: roleId,
      }),
    onSuccess: (_, v) => invalidateMemberRoleQueries(queryClient, v),
  });
}

/**
 * Take a role away from a member. The server refuses the member's last role
 * and the last owner's owner role (400), and moves the active role when the
 * one removed was active.
 */
export function useRemoveMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, memberId, roleId }: MemberRoleMutationInput) =>
      api.delete<RoleSummaryDto[]>(
        orgRbacPath(userId, orgId, `/members/${memberId}/roles/${roleId}`)
      ),
    onSuccess: (_, v) => invalidateMemberRoleQueries(queryClient, v),
  });
}

/**
 * Switch the caller's ACTIVE role to another role assigned to them. Every
 * rbac query is dropped so the sidebar, route boundaries and action buttons
 * re-resolve against the new role's grants.
 */
export function useSwitchActiveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orgId, roleId }: { userId: string; orgId: string; roleId: string }) =>
      api.put(orgRbacPath(userId, orgId, "/my-active-role"), { role_id: roleId }),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["rbac"] });
      queryClient.invalidateQueries({ queryKey: ["org-members", v.userId, v.orgId] });
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
  /** Roles assigned to the caller in this org (active included). */
  assignedRoles: RoleSummaryDto[];
  modules: string[];
  is_owner: boolean;
  is_admin: boolean;
  /** True once my-permissions resolved with data — gating only applies then. */
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
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
 * FAIL-CLOSED (TSR-332): while the permission set is unknown — loading, or the
 * request failed — `can` and `hasModule` answer false. Nothing is offered
 * until the server has said it is allowed: the sidebar renders a skeleton,
 * route boundaries a spinner/retry, and action buttons simply do not render.
 * (This used to fail open for the `RBAC_ENFORCEMENT=log` rollout; the
 * endpoint is live everywhere, and a button that appears and then vanishes is
 * worse than one that appears a moment late.)
 */
export function usePermissions(): UsePermissionsResult {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const query = useMyPermissions(user?.userId, org?.id);

  const data = query.data;

  const can = useCallback(
    (module: string, action: string, submodule?: string): boolean => {
      if (!data) return false; // fail-closed until permissions resolve
      if (data.is_owner) return true;
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
      if (!data) return false; // fail-closed until permissions resolve
      if (data.is_owner) return true;
      return data.modules.includes(module);
    },
    [data]
  );

  return {
    can,
    hasModule,
    assignedRoles: data?.assigned_roles ?? (data ? [{ ...data.role }] : []),
    modules: data?.modules ?? [],
    is_owner: data?.is_owner ?? false,
    is_admin: data?.is_admin ?? false,
    isReady: !!data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => { void query.refetch(); },
    role: data?.role ?? null,
  };
}

export interface ActionPermissions {
  canRead: boolean;
  /** "Add" buttons. */
  canCreate: boolean;
  /** "Edit" buttons and forms. */
  canUpdate: boolean;
  /**
   * "Delete" AND "change status" (activate / deactivate) — both remove the
   * record from normal use, so both need `delete` (TSR-332 action mapping).
   */
  canDelete: boolean;
  /** Any of the above resolved — false while permissions are loading. */
  isReady: boolean;
}

/**
 * The standard verb set for one `module/submodule` pair. Pages render a
 * control only when its flag is true; an unauthorised control is not
 * rendered at all (never merely disabled). Fail-closed like `can`.
 */
export function useActionPermissions(module: string, submodule: string): ActionPermissions {
  const { can, isReady } = usePermissions();
  return useMemo(
    () => ({
      canRead: can(module, "read", submodule),
      canCreate: can(module, "create", submodule),
      canUpdate: can(module, "update", submodule),
      canDelete: can(module, "delete", submodule),
      isReady,
    }),
    [can, isReady, module, submodule]
  );
}

/**
 * Editor types the current role may CREATE.
 *
 * Two independent gates, because the menu mixes two kinds of thing:
 *
 *   • **Hacienda documents** — offered only in `electronic` mode. Without a
 *     registered organization there is no cédula to sign with and no economic
 *     activity for a line, so these are not merely unsent, they are
 *     unbuildable. Each is then gated on `documents/<permSub>` (credit/debit
 *     notes are restricted per role; cashiers only get FE/TE).
 *   • **The manual order (`PM`)** — offered to EVERY org, gated on
 *     `commercial/create/orders`. A pedido is not a fiscal document and is not
 *     always billed: what ships, and whether it is invoiced afterwards, is the
 *     user's call. A registered taxpayer invoices a delivered order from the
 *     order page (`docs/MANUAL_ORDERS.md` §7); an `orders-only` org simply
 *     never does.
 *
 * Both gates fail CLOSED: until my-permissions resolves nothing is offered,
 * and while the fiscal mode is unknown the Hacienda types stay hidden rather
 * than offering a document the org may not be able to build.
 */
export function useCreatableDocTypes(): readonly EditorDocumentTypeInfo[] {
  const { can } = usePermissions();
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const fiscal = useFiscalMode(org?.id);

  return useMemo(() => {
    const types: EditorDocumentTypeInfo[] = fiscal.isElectronic
      ? DOCUMENT_TYPES.filter((dt) => can("documents", "create", dt.permSub))
      : [];

    if (can("commercial", "create", "orders")) {
      types.push(MANUAL_ORDER_DOCUMENT_TYPE);
    }

    return types;
  }, [can, fiscal.isElectronic]);
}

/**
 * Whether the "+" create trigger (sidebar and navbar) should render at all.
 *
 * It used to gate purely on `documents/create/emitted`, which is right for
 * fiscal documents but would hide the menu from an org whose only creatable
 * entry is the manual order — exactly the org that needs it. So: show the
 * trigger when there is something creatable AND the caller may create either
 * an emitted document or that manual order.
 */
export function useCanOpenCreateMenu(): boolean {
  const { can } = usePermissions();
  const creatable = useCreatableDocTypes();

  const hasManualOrder = creatable.some((dt) => dt.code === MANUAL_ORDER_DOC_TYPE);
  if (creatable.length === 0) return false;
  return can("documents", "create", "emitted") || hasManualOrder;
}
