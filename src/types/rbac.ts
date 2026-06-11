/**
 * RBAC DTOs — mirror of the markets-api org-scoped RBAC contract
 * (docs/roadmap/rbac_express_contract.md §2 "Shared DTO vocabulary").
 *
 * The POS app codes against this contract, not the live server: the backend
 * is implemented in parallel against the same document.
 */

/** Permission grant row (request + response). `submoduleId: null` = module-wide grant. */
export interface PermissionGrantDto {
  moduleId: string;
  submoduleId: string | null;
  actionId: string;
}

export interface MatrixAction {
  id: string;
  name: string;
  displayName: string;
}

export interface MatrixSubmodule {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  /** Grantable actions for this submodule (from submodule_actions). */
  actions: MatrixAction[];
}

export interface MatrixModule {
  id: string;
  name: string;
  displayName: string;
  icon: string | null;
  sortOrder: number;
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
    displayName: string;
    isSystem: boolean;
    isActive: boolean;
  };
  /** role.name === 'owner' */
  isOwner: boolean;
  /** owner || admin */
  isAdmin: boolean;
  /** Module names available AND reachable by this role (nav gating). */
  modules: string[];
  /**
   * Flattened effective grants, format "module:submodule:action".
   * Module-wide grants are EXPANDED per available submodule.
   */
  permissions: string[];
}

/** Role row (= Role $inferSelect on the markets-api). */
export interface RoleDto {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
}
