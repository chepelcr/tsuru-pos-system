/**
 * RBAC DTOs — mirror of the markets-api org-scoped RBAC contract
 * (docs/roadmap/rbac_express_contract.md §2 "Shared DTO vocabulary").
 *
 * The POS app codes against this contract, not the live server: the backend
 * is implemented in parallel against the same document.
 */

/** Permission grant row (request + response). `submodule_id: null` = module-wide grant. */
export interface PermissionGrantDto {
  module_id: string;
  submodule_id: string | null;
  action_id: string;
}

export interface MatrixAction {
  id: string;
  name: string;
  display_name: string;
}

export interface MatrixSubmodule {
  id: string;
  name: string;
  display_name: string;
  sort_order: number;
  /** Grantable actions for this submodule (from submodule_actions). */
  actions: MatrixAction[];
}

export interface MatrixModule {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
  sort_order: number;
  submodules: MatrixSubmodule[];
}

/**
 * Org-scoped available matrix (O2) — already intersected with the org's
 * module assignment. Render ONLY what it returns.
 */
export interface AvailableMatrixDto {
  modules: MatrixModule[];
}

/** My-permissions (O1) — FE nav/action gating. */
export interface MyPermissionsDto {
  role: {
    id: string;
    name: string;
    display_name: string;
    is_system: boolean;
    is_active: boolean;
  };
  /** role.name === 'owner' */
  is_owner: boolean;
  /** owner || admin */
  is_admin: boolean;
  /** Module names available AND reachable by this role (nav gating). */
  modules: string[];
  /**
   * Flattened effective grants, format "module:submodule:action".
   * Module-wide grants are EXPANDED per available submodule.
   */
  permissions: string[];
  /**
   * Every role assigned to the caller in this org (TSR-330), the active one
   * (`role`) included. Only the active role grants anything; the others are
   * what the caller may switch to (`PUT /rbac/my-active-role`). Optional so
   * an older backend without multi-role still type-checks at runtime.
   */
  assigned_roles?: RoleSummaryDto[];
}

/** A role as listed on a member: assigned or active. */
export interface RoleSummaryDto {
  id: string;
  name: string;
  display_name: string;
  is_system: boolean;
  is_active: boolean;
}

/** Role row (= Role $inferSelect on the markets-api). */
export interface RoleDto {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
}
