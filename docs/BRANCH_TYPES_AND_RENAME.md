# Branches and organization branch types

Updated 2026-10-15.

The POS calls branches **Sucursales / Branches** throughout navigation, checkout, sessions, reports and permissions. The canonical route is `/dashboard/branches`; old `/dashboard/stations` links, including terminal detail links, redirect to it and preserve query strings.

## Branch type management

**Internal Administration → Branch types** (`/dashboard/branch-types`) lists only the active organization's saved catalog. Users with the appropriate action grants can create, edit or delete types. The editor supports name, immutable code, icon, semantic color and display order. A referenced type cannot be deleted; the conflict appears inside its confirmation dialog.

`useBranchTypes(orgId)` reads store-be's `/api/organizations/{orgId}/branch-types`. An empty catalog stays empty. Failed reads show an error and retry control instead of inventing fallback types. Mutations invalidate that organization's catalog, updating branch forms, cards and filters. Changing organizations closes editors and confirmations.

The branch form labels its selector **Tipo de sucursal / Branch type**, uses the organization's catalog and offers a management link when permitted. New branches select the first saved type. An organization with an empty catalog must add a type before manually creating a branch.

Session configuration offers all active branches, including custom types. Session kind (`match`/`shift`) remains a separate concept with its existing API contract; it no longer filters branches by `stand`/`restaurant`. Its private query key avoids colliding with the shared branch array cache.

## API and data compatibility

Store-be owns GET/POST collection and PUT/DELETE item routes. Endpoint guards use `admin/branch-types` actions. Type codes remain strings stored on `branches.type`; existing codes are preserved. Updating a type changes presentation fields without sending a new code.

Automatic registration/history discovery reuses an organization's first saved type. If no type exists, it persists one editable `general` catalog entry in the same transaction as the discovered branch. It does not invent the old stand/restaurant pair. Empty discovery creates no types.

Migration `20261015_branch_type_catalog` restores only codes actually referenced by existing branches and does not overwrite customized catalog rows. It was applied to dev: three missing entries restored, zero remaining branches without a catalog match.

## Permissions and rollout

The stable `admin/stations` permission key is retained, with display name **Sucursales**. New `admin/branch-types` supports create/read/update/delete. Owner/admin templates inherit their existing admin actions; manager/staff gain no new administration rights.

Management migration `0027_branch_types_admin.sql` adds the catalog/action matrix, assigns the surface to existing organizations and mirrors only the actions a role already has on stations or module-wide admin. It is idempotent and preserves custom roles. Future organizations inherit the new submodule from their normal admin module assignment.

Both migrations and the permissions setup are applied to dev; all five organizations have the new submodule available. Application rollout is tracked in the ecosystem roadmap and branch-types audit.
