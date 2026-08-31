/**
 * Dashboard navigation ids — the single source of truth.
 *
 * The union used to be re-declared in DashboardLayout, DashboardShell,
 * DashboardMobileDrawer and DashboardSidebar; adding one nav item meant
 * editing four copies and TypeScript reported the mismatch as "two different
 * types with this name exist" rather than as a missing entry. Import from here.
 *
 * Each id maps to a `[module, submodule]` RBAC pair in `NAV_PERMISSION`
 * (DashboardSidebar) and to a route in `NAV_PATHS` (DashboardLayout) — see
 * CLAUDE.md §5.1.
 */
export type NavId =
  | "dashboard"
  | "config"
  | "puestos"
  | "productos"
  | "categories"
  | "reporte"
  | "ivaReport"
  | "documents"
  | "clients"
  | "orders"
  | "confirmations"
  | "members"
  | "roles"
  | "organization"
  | "content"
  | "gallery"
  | "templates"
  | "deployments"
  | "programs"
  | "profile";
